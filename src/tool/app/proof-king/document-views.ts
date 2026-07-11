(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});

    class WordReaderView {
        private manualId = "";
        private unitElements = new Map<string, HTMLElement>();
        private focusRequestId = 0;

        constructor(private readonly container: HTMLElement) {}

        show(manual: LocalManual, focusUnitIds: string[]): void {
            if (manual.format !== "docx") {
                this.container.innerHTML = '<div class="preview-empty">当前一侧不是 Word 文档。</div>';
                this.manualId = "";
                this.unitElements.clear();
                return;
            }
            if (this.manualId !== manual.id) this.renderManual(manual);
            const requestId = ++this.focusRequestId;
            this.container.querySelectorAll(".word-unit-focus").forEach((element) => element.classList.remove("word-unit-focus"));
            const focused = focusUnitIds.map((id) => this.unitElements.get(id)).filter(Boolean) as HTMLElement[];
            focused.forEach((element) => element.classList.add("word-unit-focus"));
            const firstFocused = focused[0];
            if (!firstFocused) return;
            requestAnimationFrame(() => {
                if (requestId !== this.focusRequestId || !firstFocused.classList.contains("word-unit-focus")) return;
                this.container.scrollTop = Math.max(0, firstFocused.offsetTop - this.container.clientHeight / 2);
                requestAnimationFrame(() => this.centerFocusedUnit(firstFocused, requestId));
            });
        }

        private centerFocusedUnit(firstFocused: HTMLElement, requestId: number): void {
            if (requestId !== this.focusRequestId || !firstFocused.classList.contains("word-unit-focus")) return;
                const containerRect = this.container.getBoundingClientRect();
                const targetRect = firstFocused.getBoundingClientRect();
                const top = calculateCenteredScrollTop(
                    this.container.scrollTop,
                    containerRect.top,
                    this.container.clientHeight,
                    targetRect.top,
                    targetRect.height
                );
                this.container.scrollTo({ top, behavior: "smooth" });
        }

        private renderManual(manual: LocalManual): void {
            this.manualId = manual.id;
            this.unitElements.clear();
            const fragment = document.createDocumentFragment();
            const paper = document.createElement("div");
            paper.className = "word-reader-paper";
            manual.units.forEach((unit) => {
                const element = document.createElement(unit.kind === "table-row" ? "div" : "p");
                element.className = unit.kind === "table-row" ? "word-unit word-table-row" : "word-unit";
                if (unit.text === unit.title && unit.text.length <= 40) element.classList.add("word-heading");
                element.dataset.unitId = unit.id;
                element.textContent = unit.text;
                this.unitElements.set(unit.id, element);
                paper.appendChild(element);
            });
            fragment.appendChild(paper);
            this.container.replaceChildren(fragment);
            this.container.scrollTop = 0;
        }
    }

    class PdfPageView {
        private manualId = "";
        private pageCache = new Map<number, Promise<HTMLElement>>();
        private requestId = 0;

        constructor(private readonly container: HTMLElement) {}

        async show(manual: LocalManual, focusUnits: ManualUnit[], emptyMessage: string): Promise<void> {
            if (manual.format !== "pdf" || !manual.pdfDocument) {
                this.container.innerHTML = '<div class="preview-empty">当前一侧不是 PDF 文档。</div>';
                return;
            }
            if (this.manualId !== manual.id) {
                this.manualId = manual.id;
                this.pageCache.clear();
            }
            const pageNumber = focusUnits.find((unit) => unit.pageNumber)?.pageNumber;
            if (!pageNumber) {
                this.container.innerHTML = `<div class="preview-empty">${escapeHtml(emptyMessage)}</div>`;
                this.container.scrollTop = 0;
                return;
            }
            const requestId = ++this.requestId;
            this.container.innerHTML = '<div class="preview-empty">正在读取 PDF 原始页...</div>';
            const pageElement = await this.getPage(manual, pageNumber);
            if (requestId !== this.requestId) return;
            this.container.replaceChildren(pageElement);
            this.container.scrollTop = 0;
        }

        private getPage(manual: LocalManual, pageNumber: number): Promise<HTMLElement> {
            const cached = this.pageCache.get(pageNumber);
            if (cached) return cached;
            const promise = this.renderPage(manual, pageNumber);
            this.pageCache.set(pageNumber, promise);
            return promise;
        }

        private async renderPage(manual: LocalManual, pageNumber: number): Promise<HTMLElement> {
            const page = await manual.pdfDocument.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.25 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext("2d");
            if (!context) throw new Error("无法创建 PDF 原页画布。 ");
            await page.render({ canvasContext: context, viewport }).promise;
            const wrapper = document.createElement("div");
            wrapper.className = "pdf-page-shell";
            const label = document.createElement("div");
            label.className = "pdf-page-label";
            label.textContent = `${manual.name} / 第 ${pageNumber} 页`;
            wrapper.append(label, canvas);
            return wrapper;
        }
    }

    function buildContextWindow(
        manual: Pick<LocalManual, "units">,
        focusUnitIds: string[],
        focusText: string,
        radius = 260
    ): { before: string; focus: string; after: string } | null {
        const focusIds = new Set(focusUnitIds);
        const focusIndexes = manual.units
            .map((unit, index) => focusIds.has(unit.id) ? index : -1)
            .filter((index) => index >= 0);
        if (!focusIndexes.length) return null;

        const firstIndex = Math.min(...focusIndexes);
        const lastIndex = Math.max(...focusIndexes);
        const beforeSource = joinUnitText(manual.units.slice(0, firstIndex));
        const selectedSource = joinUnitText(manual.units.slice(firstIndex, lastIndex + 1));
        const afterSource = joinUnitText(manual.units.slice(lastIndex + 1));
        const exactStart = focusText ? selectedSource.indexOf(focusText) : -1;
        const range = exactStart >= 0
            ? { start: exactStart, end: exactStart + focusText.length }
            : findNormalizedRange(selectedSource, focusText);

        if (!range) {
            return {
                before: beforeSource.slice(-radius),
                focus: focusText || selectedSource,
                after: afterSource.slice(0, radius)
            };
        }

        const before = joinContextText(beforeSource, selectedSource.slice(0, range.start));
        const after = joinContextText(selectedSource.slice(range.end), afterSource);
        return {
            before: before.slice(-radius),
            focus: selectedSource.slice(range.start, range.end),
            after: after.slice(0, radius)
        };
    }

    function joinUnitText(units: Array<Pick<ManualUnit, "text">>): string {
        return units.map((unit) => unit.text).filter(Boolean).join("\n");
    }

    function joinContextText(first: string, second: string): string {
        if (!first) return second;
        if (!second) return first;
        return `${first}\n${second}`;
    }

    function calculateCenteredScrollTop(
        currentScrollTop: number,
        containerTop: number,
        containerHeight: number,
        targetTop: number,
        targetHeight: number
    ): number {
        const targetOffset = targetTop - containerTop;
        return Math.max(0, Math.round(currentScrollTop + targetOffset - (containerHeight - targetHeight) / 2));
    }

    function findNormalizedRange(source: string, focus: string): { start: number; end: number } | null {
        const sourceIndex = normalizeWithOffsets(source);
        const focusText = normalizeWithOffsets(focus).text;
        const normalizedStart = focusText ? sourceIndex.text.indexOf(focusText) : -1;
        if (normalizedStart < 0) return null;
        const start = sourceIndex.offsets[normalizedStart];
        const endOffset = sourceIndex.offsets[normalizedStart + focusText.length - 1];
        return start === undefined || endOffset === undefined ? null : { start, end: endOffset + 1 };
    }

    function normalizeWithOffsets(value: string): { text: string; offsets: number[] } {
        let text = "";
        const offsets: number[] = [];
        Array.from(value).forEach((raw, index) => {
            Array.from(raw.normalize("NFKC").toLowerCase()).forEach((character) => {
                if (!/[0-9a-z\u4e00-\u9fff]/.test(character)) return;
                text += character;
                offsets.push(index);
            });
        });
        return { text, offsets };
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
        WordReaderView,
        PdfPageView,
        buildContextWindow,
        calculateCenteredScrollTop,
        findNormalizedRange
    };
})();
