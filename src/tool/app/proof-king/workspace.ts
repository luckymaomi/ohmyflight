(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});

    const state: {
        myManual: LocalManual | null;
        referenceManual: LocalManual | null;
        comparison: ManualComparison | null;
        entries: DifferenceNavigationEntry[];
        entryById: Map<string, DifferenceNavigationEntry>;
        selectedDifferenceId: string;
        worker: Worker | null;
        comparisonRequestId: number;
        previewRequestId: number;
        message: string;
        messageTone: "secondary" | "success" | "danger" | "info";
    } = {
        myManual: null,
        referenceManual: null,
        comparison: null,
        entries: [],
        entryById: new Map(),
        selectedDifferenceId: "",
        worker: null,
        comparisonRequestId: 0,
        previewRequestId: 0,
        message: "上传我的手册和参考手册后开始比对。",
        messageTone: "secondary"
    };

    let myWordView: any;
    let referenceWordView: any;
    let myPdfView: any;
    let referencePdfView: any;
    let navigationFrame: number | null = null;

    function getElement<T extends HTMLElement>(id: string): T {
        const element = document.getElementById(id);
        if (!element) throw new Error(`页面缺少 ${id}。`);
        return element as T;
    }

    function bind(): void {
        myWordView = new runtime.DocumentViews.WordManualView(
            getElement("myPreview"),
            "manual-proof-word-focus-my",
            (message: string) => { setIndexStatus("my", message); }
        );
        referenceWordView = new runtime.DocumentViews.WordManualView(
            getElement("referencePreview"),
            "manual-proof-word-focus-reference",
            (message: string) => { setIndexStatus("reference", message); }
        );
        myPdfView = new runtime.DocumentViews.PdfManualView(getElement("myPreview"));
        referencePdfView = new runtime.DocumentViews.PdfManualView(getElement("referencePreview"));

        getElement<HTMLInputElement>("myInput").addEventListener("change", () => {
            void safely(() => loadManual("my"));
        });
        getElement<HTMLInputElement>("referenceInput").addEventListener("change", () => {
            void safely(() => loadManual("reference"));
        });
        getElement<HTMLButtonElement>("compareButton").addEventListener("click", () => {
            void safely(startComparison);
        });
        getElement<HTMLButtonElement>("exportButton").addEventListener("click", () => {
            if (state.comparison) runtime.ExcelReport.exportWorkbook(state.comparison);
        });
        getElement<HTMLElement>("differenceNavigation").addEventListener("scroll", scheduleNavigationRender);
        getElement<HTMLElement>("differenceNavigation").addEventListener("click", (event) => {
            const target = event.target as HTMLElement;
            const card = target.closest<HTMLElement>("[data-difference-id]");
            if (!card?.dataset.differenceId) return;
            void safely(() => selectDifference(card.dataset.differenceId || ""));
        });
        renderAll();
    }

    async function loadManual(role: ManualRole): Promise<void> {
        const input = getElement<HTMLInputElement>(role === "my" ? "myInput" : "referenceInput");
        const file = input.files?.[0];
        if (!file) return;
        setMessage(`正在读取${role === "my" ? "我的手册" : "参考手册"}：${file.name}`, "info");
        const manual = await runtime.ManualReader.readManual(file, role, getPdfRange(role));
        if (role === "my") state.myManual = manual;
        else state.referenceManual = manual;
        clearComparison();
        setMessage(`${role === "my" ? "我的手册" : "参考手册"}读取完成：${manual.name}`, "success");
        renderAll();
    }

    async function startComparison(): Promise<void> {
        if (!state.myManual || !state.referenceManual) {
            throw new Error("请先上传我的手册和参考手册。");
        }
        stopWorker();
        clearComparison();
        state.comparisonRequestId += 1;
        const requestId = state.comparisonRequestId;
        const worker = new Worker("comparison-worker.js");
        state.worker = worker;
        setMessage("正在后台比对，页面仍可继续操作。", "info");
        renderAll();

        worker.addEventListener("message", (event: MessageEvent<ComparisonWorkerProgress | ComparisonWorkerSuccess | ComparisonWorkerFailure>) => {
            const response = event.data;
            if (!response || response.requestId !== state.comparisonRequestId) return;
            if (response.type === "progress") {
                const { phase, completed, total } = response.progress;
                setMessage(total > 0 ? `${phase}：${completed}/${total}` : phase, "info");
                renderMessage();
                return;
            }
            if (response.type === "failure") {
                stopWorker();
                setMessage(response.message, "danger");
                renderMessage();
                return;
            }
            stopWorker();
            state.comparison = response.comparison;
            state.entries = runtime.WorkspaceNavigation.createEntries(response.comparison);
            state.entryById = new Map(state.entries.map((entry: DifferenceNavigationEntry) => [entry.id, entry]));
            state.selectedDifferenceId = state.entries[0]?.id || "";
            setMessage(`比对完成：共 ${state.entries.length} 条需重点复核差异。`, "success");
            renderAll();
            if (state.selectedDifferenceId) void safely(renderSelectedDifference);
        });
        worker.addEventListener("error", () => {
            if (requestId !== state.comparisonRequestId) return;
            stopWorker();
            setMessage("后台比对线程异常终止，请重新开始比对。", "danger");
            renderMessage();
        });
        worker.postMessage({
            type: "compare",
            requestId,
            myManual: runtime.ManualReader.toWorkerManual(state.myManual),
            referenceManual: runtime.ManualReader.toWorkerManual(state.referenceManual)
        } as ComparisonWorkerRequest);
    }

    async function selectDifference(id: string): Promise<void> {
        if (!state.entryById.has(id)) return;
        state.selectedDifferenceId = id;
        renderNavigation();
        await renderSelectedDifference();
    }

    async function renderSelectedDifference(): Promise<void> {
        const entry = state.entryById.get(state.selectedDifferenceId);
        if (!entry || !state.comparison || !state.myManual || !state.referenceManual) return;
        const requestId = ++state.previewRequestId;
        renderSelectionMeta(entry);
        const mySliceMap = new Map(state.comparison.mySlices.map((slice) => [slice.id, slice]));
        const referenceSliceMap = new Map(state.comparison.referenceSlices.map((slice) => [slice.id, slice]));
        const myFocus = entry.mySliceIds.map((id) => mySliceMap.get(id)).filter((slice): slice is ManualSlice => !!slice);
        const referenceFocus = entry.referenceSliceIds.map((id) => referenceSliceMap.get(id)).filter((slice): slice is ManualSlice => !!slice);

        await renderManualPreview(
            state.myManual,
            state.comparison.mySlices,
            myFocus,
            myWordView,
            myPdfView,
            "当前差异在我的手册中没有可靠定位。"
        );
        if (requestId !== state.previewRequestId) return;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await renderManualPreview(
            state.referenceManual,
            state.comparison.referenceSlices,
            referenceFocus,
            referenceWordView,
            referencePdfView,
            "当前差异在参考手册中没有可靠定位。"
        );
    }

    async function renderManualPreview(
        manual: LocalManual,
        manualSlices: ManualSlice[],
        focusSlices: ManualSlice[],
        wordView: any,
        pdfView: any,
        emptyMessage: string
    ): Promise<void> {
        if (manual.format === "docx") {
            await wordView.show(manual, manualSlices, focusSlices);
            return;
        }
        await pdfView.show(manual, focusSlices, emptyMessage);
    }

    function renderAll(): void {
        renderMessage();
        renderManualStatus();
        renderSummary();
        renderNavigation();
        renderSelectionMeta(state.entryById.get(state.selectedDifferenceId));
        getElement<HTMLButtonElement>("exportButton").disabled = !state.comparison;
    }

    function renderMessage(): void {
        const message = getElement<HTMLElement>("workspaceMessage");
        message.className = `alert alert-${state.messageTone} py-2 mb-3`;
        message.textContent = state.message;
    }

    function renderManualStatus(): void {
        getElement<HTMLElement>("myStatus").textContent = describeManual(state.myManual);
        getElement<HTMLElement>("referenceStatus").textContent = describeManual(state.referenceManual);
        getElement<HTMLElement>("myPreviewName").textContent = state.myManual?.name || "全文原文";
        getElement<HTMLElement>("referencePreviewName").textContent = state.referenceManual?.name || "全文原文";
        setIndexStatus("my", describeIndexState(state.myManual));
        setIndexStatus("reference", describeIndexState(state.referenceManual));
    }

    function describeManual(manual: LocalManual | null): string {
        if (!manual) return "未上传";
        const type = manual.format === "docx" ? "Word 全文预览" : `PDF 原页 / 共 ${manual.pageCount || 0} 页`;
        return `${manual.name} / ${type} / ${manual.units.length} 个文本单元`;
    }

    function describeIndexState(manual: LocalManual | null): string {
        if (!manual) return "";
        return manual.format === "docx" ? "定位索引待建立" : "PDF 原页预览";
    }

    function setIndexStatus(role: ManualRole, message: string): void {
        const element = getElement<HTMLElement>(role === "my" ? "myIndexStatus" : "referenceIndexStatus");
        element.textContent = message;
        element.dataset.ready = message.startsWith("定位索引已建立") ? "true" : "false";
    }

    function renderSummary(): void {
        const summary = getElement<HTMLElement>("summaryGrid");
        if (!state.comparison) {
            summary.innerHTML = "";
            return;
        }
        const values = [
            ["我的手册缺失", state.comparison.summary.myMissingBlockCount, "danger"],
            ["参考手册缺失", state.comparison.summary.referenceMissingBlockCount, "primary"],
            ["微调", state.comparison.summary.microCount, "warning"],
            ["需确认", state.comparison.summary.reviewCount, "secondary"],
            ["覆盖率", runtime.ExcelReport.formatPercent(state.comparison.summary.myCoverageRate), "info"]
        ];
        summary.innerHTML = values.map(([label, value, tone]) => `
            <div class="summary-item summary-${escapeHtml(tone)}">
                <div class="summary-label">${escapeHtml(label)}</div>
                <div class="summary-value">${escapeHtml(value)}</div>
            </div>
        `).join("");
    }

    function renderNavigation(): void {
        const navigation = getElement<HTMLElement>("differenceNavigation");
        const spacer = getElement<HTMLElement>("differenceNavigationSpacer");
        const visible = getElement<HTMLElement>("differenceNavigationVisible");
        if (!state.entries.length) {
            spacer.style.height = "0";
            visible.replaceChildren();
            navigation.classList.remove("has-results");
            return;
        }
        navigation.classList.add("has-results");
        const range = runtime.WorkspaceNavigation.calculateWindow(
            navigation.scrollTop,
            navigation.clientHeight,
            state.entries.length
        ) as VirtualNavigationWindow;
        spacer.style.height = `${range.totalHeight}px`;
        visible.style.transform = `translateY(${range.offsetTop}px)`;
        visible.innerHTML = state.entries.slice(range.start, range.end)
            .map((entry) => renderNavigationCard(entry, entry.id === state.selectedDifferenceId))
            .join("");
    }

    function scheduleNavigationRender(): void {
        if (navigationFrame !== null) return;
        navigationFrame = requestAnimationFrame(() => {
            navigationFrame = null;
            renderNavigation();
        });
    }

    function renderNavigationCard(entry: DifferenceNavigationEntry, selected: boolean): string {
        const label = runtime.WorkspaceNavigation.statusLabel(entry.kind);
        return `
            <button class="difference-card difference-${escapeHtml(entry.kind)}${selected ? " active" : ""}" data-difference-id="${escapeHtml(entry.id)}" type="button">
                <div class="difference-card-head">
                    <span class="difference-kind">${escapeHtml(label)}</span>
                    <span class="difference-location">${escapeHtml(entry.location)}</span>
                </div>
                <div class="difference-reason">${escapeHtml(entry.reason)}</div>
                <div class="difference-text">${escapeHtml(entry.text)}</div>
            </button>
        `;
    }

    function renderSelectionMeta(entry: DifferenceNavigationEntry | undefined): void {
        const meta = getElement<HTMLElement>("selectionMeta");
        if (!entry) {
            meta.innerHTML = `<span class="text-muted">选择一条差异后查看原文。</span>`;
            return;
        }
        meta.innerHTML = `
            <div>
                <div class="selection-title">${escapeHtml(runtime.WorkspaceNavigation.statusLabel(entry.kind))}</div>
                <div class="text-muted small">${escapeHtml(entry.reason)}</div>
            </div>
            <span class="selection-location">${escapeHtml(entry.location)}</span>
        `;
    }

    function getPdfRange(role: ManualRole): { startPage: number | ""; endPage: number | "" } {
        const prefix = role === "my" ? "my" : "reference";
        const start = Number(getElement<HTMLInputElement>(`${prefix}StartPage`).value);
        const end = Number(getElement<HTMLInputElement>(`${prefix}EndPage`).value);
        return {
            startPage: Number.isFinite(start) && start > 0 ? Math.trunc(start) : "",
            endPage: Number.isFinite(end) && end > 0 ? Math.trunc(end) : ""
        };
    }

    function clearComparison(): void {
        stopWorker();
        state.comparison = null;
        state.entries = [];
        state.entryById.clear();
        state.selectedDifferenceId = "";
        state.previewRequestId += 1;
    }

    function stopWorker(): void {
        state.worker?.terminate();
        state.worker = null;
    }

    async function safely(action: () => Promise<void>): Promise<void> {
        try {
            await action();
        } catch (error) {
            setMessage(error instanceof Error ? error.message : String(error), "danger");
            renderMessage();
        }
    }

    function setMessage(message: string, tone: typeof state.messageTone): void {
        state.message = message;
        state.messageTone = tone;
    }

    function escapeHtml(value: unknown): string {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    runtime.Workspace = {
        bind,
        state
    };
})();
