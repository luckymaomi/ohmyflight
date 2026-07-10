(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});

    type IndexedWordBlock = {
        element: HTMLElement;
        normalized: string;
    };

    class WordManualView {
        private renderedManualId = "";
        private blocks: IndexedWordBlock[] = [];
        private exactBlocks = new Map<string, HTMLElement>();
        private anchorBlocks = new Map<string, HTMLElement>();
        private sliceElements = new Map<string, HTMLElement>();
        private indexedSliceManualId = "";
        private indexedSliceCount = 0;
        private indexBuildPromise: Promise<void> | null = null;
        private resizeObserver: ResizeObserver | null = null;
        private resizeFrame: number | null = null;

        constructor(
            private readonly container: HTMLElement,
            private readonly highlightName: string,
            private readonly setIndexState: (message: string) => void
        ) {}

        async show(manual: LocalManual, manualSlices: ManualSlice[], focusSlices: ManualSlice[]): Promise<void> {
            if (manual.format !== "docx" || !manual.wordPreviewData) {
                this.container.innerHTML = `<div class="preview-empty">当前文档不是可预览的 Word。</div>`;
                this.setIndexState("");
                return;
            }
            if (this.renderedManualId !== manual.id) {
                if (!window.docx?.renderAsync) throw new Error("页面缺少 Word 预览组件。");
                this.disconnectResizeObserver();
                this.container.replaceChildren();
                this.renderedManualId = manual.id;
                await window.docx.renderAsync(manual.wordPreviewData.slice(0), this.container, this.container, {
                    className: "manual-word-page",
                    inWrapper: true,
                    breakPages: true,
                    ignoreLastRenderedPageBreak: false,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    renderEndnotes: true,
                    renderComments: false,
                    useBase64URL: true
                });
                this.buildTextIndex();
                this.fitPagesToContainer();
                this.observeContainerWidth();
            }
            await this.ensureSliceIndex(manual, manualSlices);
            this.focus(focusSlices);
        }

        private buildTextIndex(): void {
            this.blocks = [];
            this.exactBlocks.clear();
            this.anchorBlocks.clear();
            this.sliceElements.clear();
            this.indexedSliceManualId = "";
            this.indexedSliceCount = 0;
            const elements = Array.from(this.container.querySelectorAll<HTMLElement>("p, li, td, th, h1, h2, h3, h4, h5, h6"));
            elements.forEach((element) => {
                const text = element.textContent || "";
                const normalized = normalizeForMatch(text);
                if (!normalized) return;
                this.blocks.push({ element, normalized });
                if (!this.exactBlocks.has(normalized)) this.exactBlocks.set(normalized, element);
                wordAnchorKeys(text).forEach((anchor) => {
                    if (!this.anchorBlocks.has(anchor)) this.anchorBlocks.set(anchor, element);
                });
            });
        }

        private async ensureSliceIndex(manual: LocalManual, manualSlices: ManualSlice[]): Promise<void> {
            if (this.indexedSliceManualId === manual.id && this.indexedSliceCount === manualSlices.length) return;
            if (!this.indexBuildPromise) {
                const task = this.buildSliceIndex(manual.id, manualSlices);
                this.indexBuildPromise = task;
                try {
                    await task;
                } finally {
                    if (this.indexBuildPromise === task) this.indexBuildPromise = null;
                }
                return;
            }
            await this.indexBuildPromise;
            await this.ensureSliceIndex(manual, manualSlices);
        }

        private async buildSliceIndex(manualId: string, manualSlices: ManualSlice[]): Promise<void> {
            this.sliceElements.clear();
            this.indexedSliceManualId = "";
            this.indexedSliceCount = 0;
            this.setIndexState(`正在建立定位索引 0/${manualSlices.length}`);
            for (let index = 0; index < manualSlices.length; index += 1) {
                if (this.renderedManualId !== manualId) return;
                const slice = manualSlices[index];
                const element = this.findBlock(slice.text);
                if (element) this.sliceElements.set(slice.id, element);
                if ((index + 1) % 240 === 0 || index + 1 === manualSlices.length) {
                    this.setIndexState(`正在建立定位索引 ${index + 1}/${manualSlices.length}`);
                    await yieldToBrowser();
                }
            }
            if (this.renderedManualId !== manualId) return;
            this.indexedSliceManualId = manualId;
            this.indexedSliceCount = manualSlices.length;
            this.setIndexState(`定位索引已建立 ${this.sliceElements.size}/${manualSlices.length}`);
        }

        private focus(focusSlices: ManualSlice[]): void {
            this.clearFocus();
            const focusElements: HTMLElement[] = [];
            const ranges: Range[] = [];
            focusSlices.forEach((slice) => {
                const element = this.sliceElements.get(slice.id) || this.findBlock(slice.text);
                if (!element) return;
                this.sliceElements.set(slice.id, element);
                element.classList.add("word-focus-block");
                focusElements.push(element);
                const range = createPhraseRange(element, slice.text);
                if (range) ranges.push(range);
            });
            const firstElement = focusElements[0];
            if (!firstElement) return;
            const highlights = typeof CSS === "undefined" ? null : (CSS as any).highlights;
            const HighlightConstructor = (window as any).Highlight;
            if (ranges.length && highlights?.set && HighlightConstructor) {
                highlights.set(this.highlightName, new HighlightConstructor(...ranges));
            }
            firstElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        private findBlock(phrase: string): HTMLElement | null {
            const normalized = normalizeForMatch(phrase);
            if (!normalized) return null;
            const exact = this.exactBlocks.get(normalized);
            if (exact) return exact;
            for (const anchor of wordAnchorKeys(phrase)) {
                const byAnchor = this.anchorBlocks.get(anchor);
                if (byAnchor) return byAnchor;
            }
            return this.blocks.find((block) => block.normalized.includes(normalized) || normalized.includes(block.normalized))?.element || null;
        }

        private clearFocus(): void {
            this.container.querySelectorAll(".word-focus-block").forEach((element) => {
                element.classList.remove("word-focus-block");
            });
            const highlights = typeof CSS === "undefined" ? null : (CSS as any).highlights;
            highlights?.delete?.(this.highlightName);
        }

        private observeContainerWidth(): void {
            if (typeof ResizeObserver === "undefined") return;
            this.resizeObserver = new ResizeObserver(() => {
                if (this.resizeFrame !== null) cancelAnimationFrame(this.resizeFrame);
                this.resizeFrame = requestAnimationFrame(() => {
                    this.resizeFrame = null;
                    this.fitPagesToContainer();
                });
            });
            this.resizeObserver.observe(this.container);
        }

        private disconnectResizeObserver(): void {
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
            if (this.resizeFrame !== null) cancelAnimationFrame(this.resizeFrame);
            this.resizeFrame = null;
        }

        private fitPagesToContainer(): void {
            const availableWidth = Math.max(1, this.container.clientWidth - 24);
            const pages = Array.from(this.container.querySelectorAll<HTMLElement>("section.manual-word-page"));
            pages.forEach((page) => {
                page.style.zoom = "1";
                const naturalWidth = Math.max(page.getBoundingClientRect().width, page.scrollWidth);
                const scale = naturalWidth > availableWidth ? availableWidth / naturalWidth : 1;
                page.style.zoom = String(Math.max(0.2, Math.min(1, scale)));
            });
        }
    }

    class PdfManualView {
        private cachedManualId = "";
        private cachedPages = new Map<number, Promise<HTMLElement>>();
        private currentRequest = 0;

        constructor(private readonly container: HTMLElement) {}

        async show(manual: LocalManual, focusSlices: ManualSlice[], emptyMessage: string): Promise<void> {
            if (manual.format !== "pdf" || !manual.pdfDocument) {
                this.container.innerHTML = `<div class="preview-empty">当前文档不是可预览的 PDF。</div>`;
                return;
            }
            if (this.cachedManualId !== manual.id) {
                this.cachedManualId = manual.id;
                this.cachedPages.clear();
            }
            const focusSlice = focusSlices[0];
            if (!focusSlice?.pageNumber) {
                this.container.innerHTML = `<div class="preview-empty">${escapeHtml(emptyMessage)}</div>`;
                return;
            }
            const request = ++this.currentRequest;
            this.container.innerHTML = `<div class="preview-empty">正在显示 PDF 原页。</div>`;
            const pageView = await this.getPageView(manual, focusSlice.pageNumber);
            if (request !== this.currentRequest) return;
            const unit = manual.units.find((item) => item.pageNumber === focusSlice.pageNumber);
            const context = buildPdfTextContext(unit?.text || "", focusSlice.text);
            const contextElement = document.createElement("section");
            contextElement.className = "pdf-context";
            contextElement.innerHTML = `
                <div class="pdf-context-title">PDF 文字上下文</div>
                <div class="pdf-context-part"><span>前文</span>${escapeHtml(context.before)}</div>
                <div class="pdf-context-part"><span>定位文本</span>${escapeHtml(context.focus)}</div>
                <div class="pdf-context-part"><span>后文</span>${escapeHtml(context.after)}</div>
            `;
            this.container.replaceChildren(pageView, contextElement);
        }

        private getPageView(manual: LocalManual, pageNumber: number): Promise<HTMLElement> {
            const cached = this.cachedPages.get(pageNumber);
            if (cached) return cached;
            const created = this.renderPage(manual, pageNumber);
            this.cachedPages.set(pageNumber, created);
            return created;
        }

        private async renderPage(manual: LocalManual, pageNumber: number): Promise<HTMLElement> {
            const page = await manual.pdfDocument.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.2 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) throw new Error("无法创建 PDF 预览画布。");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({ canvasContext: context, viewport }).promise;
            const wrapper = document.createElement("div");
            wrapper.className = "pdf-page";
            const label = document.createElement("div");
            label.className = "pdf-page-label";
            label.textContent = `${manual.name} / 第 ${pageNumber} 页`;
            wrapper.append(label, canvas);
            return wrapper;
        }
    }

    function buildPdfTextContext(text: string, phrase: string, radius = 200): { before: string; focus: string; after: string; matched: boolean } {
        const source = String(text || "");
        const range = findTextRange(source, String(phrase || ""));
        if (!range) {
            return {
                before: source.slice(0, radius),
                focus: phrase,
                after: source.slice(Math.max(0, source.length - radius)),
                matched: false
            };
        }
        return {
            before: source.slice(Math.max(0, range.start - radius), range.start),
            focus: source.slice(range.start, range.end),
            after: source.slice(range.end, range.end + radius),
            matched: true
        };
    }

    function findTextRange(source: string, phrase: string): { start: number; end: number } | null {
        if (!phrase) return null;
        const exact = source.indexOf(phrase);
        if (exact >= 0) return { start: exact, end: exact + phrase.length };
        const sourceNormalized = normalizeWithOffsets(source);
        const query = normalizeWithOffsets(phrase).text;
        const normalizedIndex = query ? sourceNormalized.text.indexOf(query) : -1;
        if (normalizedIndex < 0) return null;
        const start = sourceNormalized.offsets[normalizedIndex];
        const end = sourceNormalized.offsets[normalizedIndex + query.length - 1];
        if (start === undefined || end === undefined) return null;
        let sentenceEnd = end + 1;
        while (sentenceEnd < source.length && /[。；！？!?]/.test(source.charAt(sentenceEnd))) {
            sentenceEnd += 1;
        }
        return { start, end: sentenceEnd };
    }

    function normalizeWithOffsets(value: string): { text: string; offsets: number[] } {
        let text = "";
        const offsets: number[] = [];
        Array.from(value).forEach((rawCharacter, index) => {
            Array.from(rawCharacter.normalize("NFKC").toLowerCase()).forEach((character) => {
                if (!/[0-9a-z\u4e00-\u9fff]/.test(character)) return;
                text += character;
                offsets.push(index);
            });
        });
        return { text, offsets };
    }

    function normalizeForMatch(value: string): string {
        return String(value || "")
            .normalize("NFKC")
            .toLowerCase()
            .replace(/[^0-9a-z\u4e00-\u9fff]+/g, "");
    }

    function wordAnchorKeys(value: string): string[] {
        const keys = new Set<string>();
        const addAnchors = (text: string) => {
            const normalized = normalizeForMatch(text);
            [24, 16, 8].forEach((length) => {
                if (normalized.length >= length) keys.add(normalized.slice(0, length));
            });
        };
        addAnchors(value);
        String(value || "")
            .split(/[\n。！？!?；;，,、：:]+/)
            .forEach(addAnchors);
        return Array.from(keys);
    }

    function yieldToBrowser(): Promise<void> {
        return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    function createPhraseRange(root: HTMLElement, phrase: string): Range | null {
        const source = root.textContent || "";
        const start = source.indexOf(phrase);
        if (start < 0) return null;
        return createTextRange(root, start, start + phrase.length);
    }

    function createTextRange(root: HTMLElement, start: number, end: number): Range | null {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let offset = 0;
        let startNode: Text | null = null;
        let endNode: Text | null = null;
        let startOffset = 0;
        let endOffset = 0;
        let node = walker.nextNode();
        while (node) {
            const textNode = node as Text;
            const length = (textNode.textContent || "").length;
            if (!startNode && start >= offset && start <= offset + length) {
                startNode = textNode;
                startOffset = start - offset;
            }
            if (end >= offset && end <= offset + length) {
                endNode = textNode;
                endOffset = end - offset;
                break;
            }
            offset += length;
            node = walker.nextNode();
        }
        if (!startNode || !endNode) return null;
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
    }

    function escapeHtml(value: unknown): string {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    runtime.DocumentViews = {
        WordManualView,
        PdfManualView,
        buildPdfTextContext,
        findTextRange,
        wordAnchorKeys
    };
})();
