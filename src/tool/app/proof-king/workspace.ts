(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});

    const state: {
        myManual: LocalManual | null;
        referenceManual: LocalManual | null;
        comparison: ManualComparison | null;
        visibleEvents: RevisionEvent[];
        selectedId: string;
        filter: RevisionKind | "all";
        query: string;
        worker: Worker | null;
        requestId: number;
        previewRequestId: number;
    } = {
        myManual: null,
        referenceManual: null,
        comparison: null,
        visibleEvents: [],
        selectedId: "",
        filter: "all",
        query: "",
        worker: null,
        requestId: 0,
        previewRequestId: 0
    };

    let myWordView: any;
    let referenceWordView: any;
    let myPdfView: any;
    let referencePdfView: any;
    let navigationFrame: number | null = null;

    function bind(): void {
        myWordView = new runtime.DocumentViews.WordReaderView(element("mySource"));
        referenceWordView = new runtime.DocumentViews.WordReaderView(element("referenceSource"));
        myPdfView = new runtime.DocumentViews.PdfDocumentView(element("mySource"));
        referencePdfView = new runtime.DocumentViews.PdfDocumentView(element("referenceSource"));

        input("myInput").addEventListener("change", () => void safely(() => loadManual("my")));
        input("referenceInput").addEventListener("change", () => void safely(() => loadManual("reference")));
        button("compareButton").addEventListener("click", () => void safely(startComparison));
        button("exportButton").addEventListener("click", () => {
            if (state.comparison) runtime.ExcelReport.exportWorkbook(state.comparison);
        });
        input("eventSearch").addEventListener("input", () => {
            state.query = input("eventSearch").value;
            applyFilter();
        });
        element("filterBar").addEventListener("click", (event) => {
            const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-filter]");
            if (!target?.dataset.filter) return;
            state.filter = target.dataset.filter as RevisionKind | "all";
            applyFilter();
        });
        element("eventNavigation").addEventListener("scroll", scheduleNavigation);
        element("eventNavigation").addEventListener("click", (event) => {
            const target = (event.target as HTMLElement).closest<HTMLElement>("[data-event-id]");
            if (!target?.dataset.eventId) return;
            state.selectedId = target.dataset.eventId;
            renderNavigation();
            void safely(renderSelection);
        });
        renderState();
    }

    async function loadManual(role: ManualRole): Promise<void> {
        const fileInput = input(role === "my" ? "myInput" : "referenceInput");
        const file = fileInput.files?.[0];
        if (!file) return;
        setMessage(`正在读取${role === "my" ? "我的手册" : "参考手册"}：${file.name}`, "info");
        const manual = await runtime.ManualReader.readManual(file, role, pdfRange(role));
        if (role === "my") state.myManual = manual;
        else state.referenceManual = manual;
        clearComparison();
        setMessage(`${role === "my" ? "我的手册" : "参考手册"}读取完成，共 ${manual.units.length} 个原文单元。`, "success");
        renderState();
        await showInitialManual(manual);
    }

    async function showInitialManual(manual: LocalManual): Promise<void> {
        const wordView = manual.role === "my" ? myWordView : referenceWordView;
        const pdfView = manual.role === "my" ? myPdfView : referencePdfView;
        if (manual.format === "docx") wordView.show(manual, []);
        else await pdfView.show(manual, manual.units.slice(0, 1), "完成比对后按差异定位 PDF 原页。 ");
    }

    async function startComparison(): Promise<void> {
        if (!state.myManual || !state.referenceManual) throw new Error("请先上传我的手册和参考手册。 ");
        clearComparison();
        state.requestId += 1;
        const requestId = state.requestId;
        const worker = new Worker("comparison-worker.js");
        state.worker = worker;
        button("compareButton").disabled = true;
        setMessage("正在后台建立原文锚点和顺序对应，页面仍可操作。", "info");
        worker.addEventListener("message", (event: MessageEvent<ComparisonWorkerProgress | ComparisonWorkerSuccess | ComparisonWorkerFailure>) => {
            const response = event.data;
            if (!response || response.requestId !== state.requestId) return;
            if (response.type === "progress") {
                const { phase, completed, total } = response.progress;
                setMessage(`${phase}${total ? `：${completed}/${total}` : ""}`, "info");
                return;
            }
            stopWorker();
            button("compareButton").disabled = false;
            if (response.type === "failure") {
                setMessage(response.message, "danger");
                return;
            }
            state.comparison = response.comparison;
            state.filter = "all";
            state.query = "";
            input("eventSearch").value = "";
            applyFilter();
            setMessage(`比对完成：整理为 ${response.comparison.events.length} 个修订事件。`, "success");
        });
        worker.addEventListener("error", () => {
            if (requestId !== state.requestId) return;
            stopWorker();
            button("compareButton").disabled = false;
            setMessage("后台比对异常终止，请重新开始。", "danger");
        });
        worker.postMessage({
            type: "compare",
            requestId,
            myManual: runtime.ManualReader.toWorkerManual(state.myManual),
            referenceManual: runtime.ManualReader.toWorkerManual(state.referenceManual)
        } as ComparisonWorkerRequest);
    }

    function applyFilter(): void {
        state.visibleEvents = state.comparison
            ? runtime.Navigation.filterEvents(state.comparison.events, state.filter, state.query)
            : [];
        if (!state.visibleEvents.some((event) => event.id === state.selectedId)) {
            state.selectedId = state.visibleEvents[0]?.id || "";
        }
        element("eventNavigation").scrollTop = 0;
        renderState();
        if (state.selectedId) void safely(renderSelection);
    }

    function renderState(): void {
        renderManualStatus();
        renderSummary();
        renderFilters();
        renderNavigation();
        button("exportButton").disabled = !state.comparison;
        if (!state.selectedId) renderEmptySelection();
    }

    function renderManualStatus(): void {
        element("myStatus").textContent = manualStatus(state.myManual);
        element("referenceStatus").textContent = manualStatus(state.referenceManual);
        element("mySourceName").textContent = state.myManual?.name || "我的手册原文";
        element("referenceSourceName").textContent = state.referenceManual?.name || "参考手册原文";
    }

    function manualStatus(manual: LocalManual | null): string {
        if (!manual) return "未上传";
        const format = manual.format === "docx" ? "Word 全文阅读" : `PDF 原页，共 ${manual.pageCount} 页`;
        return `${manual.name} / ${format} / ${manual.units.length} 个原文单元`;
    }

    function renderSummary(): void {
        const summary = state.comparison?.summary;
        const values: Array<[string, number, string]> = summary ? [
            ["参考新增", summary.referenceAddedCount, "added"],
            ["参考删除", summary.referenceRemovedCount, "removed"],
            ["内容修改", summary.modifiedCount, "modified"],
            ["待确认", summary.reviewCount, "review"],
            ["顺序一致", summary.sameSliceCount, "same"]
        ] : [];
        element("summaryGrid").innerHTML = values.map(([label, value, tone]) => `
            <div class="summary-item summary-${tone}"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>
        `).join("");
    }

    function renderFilters(): void {
        element("filterBar").querySelectorAll<HTMLElement>("[data-filter]").forEach((item) => {
            item.classList.toggle("active", item.dataset.filter === state.filter);
        });
        element("resultCount").textContent = state.comparison ? `${state.visibleEvents.length} 项` : "";
    }

    function renderNavigation(): void {
        const navigation = element("eventNavigation");
        const spacer = element("eventSpacer");
        const visible = element("eventVisible");
        if (!state.visibleEvents.length) {
            spacer.style.height = "0";
            visible.innerHTML = state.comparison ? '<div class="navigation-empty">当前筛选没有修订事件。</div>' : '<div class="navigation-empty">完成比对后显示修订事件。</div>';
            return;
        }
        const range = runtime.Navigation.calculateWindow(navigation.scrollTop, navigation.clientHeight, state.visibleEvents.length) as VirtualWindow;
        spacer.style.height = `${range.totalHeight}px`;
        visible.style.transform = `translateY(${range.offsetTop}px)`;
        visible.innerHTML = state.visibleEvents.slice(range.start, range.end).map((event) => `
            <button type="button" class="event-row event-${event.kind}${event.id === state.selectedId ? " active" : ""}" data-event-id="${escapeHtml(event.id)}">
                <span class="event-kind">${escapeHtml(runtime.Navigation.label(event.kind))}</span>
                <strong>${escapeHtml(event.title)}</strong>
                <span class="event-location">${escapeHtml(event.referenceLocation !== "无对应原文" ? event.referenceLocation : event.myLocation)}</span>
                <span class="event-excerpt">${escapeHtml(event.referenceText || event.myText)}</span>
            </button>
        `).join("");
    }

    function scheduleNavigation(): void {
        if (navigationFrame !== null) return;
        navigationFrame = requestAnimationFrame(() => {
            navigationFrame = null;
            renderNavigation();
        });
    }

    async function renderSelection(): Promise<void> {
        const comparison = state.comparison;
        const event = state.visibleEvents.find((item) => item.id === state.selectedId)
            || comparison?.events.find((item) => item.id === state.selectedId);
        if (!comparison || !event || !state.myManual || !state.referenceManual) return;
        const requestId = ++state.previewRequestId;
        element("selectionTitle").textContent = `${runtime.Navigation.label(event.kind)} / ${event.title}`;
        element("selectionReason").textContent = event.reason;
        element("myChangeLocation").textContent = selectionLocation(state.myManual, event, "my");
        element("referenceChangeLocation").textContent = selectionLocation(state.referenceManual, event, "reference");
        element("myChangeText").innerHTML = renderEventContext(state.myManual, event, "my");
        element("referenceChangeText").innerHTML = renderEventContext(state.referenceManual, event, "reference");
        element("tokenChanges").textContent = tokenDescription(event);

        const myUnits = unitsFor(state.myManual, focusUnitIds(event, "my"));
        const referenceUnits = unitsFor(state.referenceManual, focusUnitIds(event, "reference"));
        await Promise.all([
            showSource(state.myManual, myUnits, myWordView, myPdfView, "该修订事件在我的手册中没有对应原文。 "),
            showSource(state.referenceManual, referenceUnits, referenceWordView, referencePdfView, "该修订事件在参考手册中没有对应原文。 ")
        ]);
        if (requestId !== state.previewRequestId) return;
    }

    async function showSource(manual: LocalManual, units: ManualUnit[], wordView: any, pdfView: any, emptyMessage: string): Promise<void> {
        if (manual.format === "docx") {
            pdfView.reset();
            wordView.show(manual, units.map((unit) => unit.id));
        }
        else await pdfView.show(manual, units, emptyMessage);
    }

    function unitsFor(manual: LocalManual, ids: string[]): ManualUnit[] {
        const idSet = new Set(ids);
        return manual.units.filter((unit) => idSet.has(unit.id));
    }

    function renderDiff(segments: DiffSegment[]): string {
        return segments.map((segment) => `<span class="diff-${segment.kind}">${escapeHtml(segment.text)}</span>`).join("");
    }

    function renderEventContext(manual: LocalManual, event: RevisionEvent, role: ManualRole): string {
        const eventText = role === "my" ? event.myText : event.referenceText;
        const difference = role === "my" ? event.myDiff : event.referenceDiff;
        const unitIds = role === "my" ? event.myUnitIds : event.referenceUnitIds;
        if (event.contextAnchors.length && (event.kind === "reference-added" || event.kind === "reference-removed")) {
            return renderAnchoredContext(event, role, eventText, difference);
        }
        if (!eventText) return '<span class="missing-text">无对应原文</span>';
        const context = runtime.DocumentViews.buildContextWindow(manual, unitIds, eventText);
        if (!context) return `<span class="context-focus">${renderDiff(difference)}</span>`;
        return [
            `<span class="context-neighbor">${escapeHtml(context.before)}</span>`,
            `<span class="context-focus">${renderDiff(difference)}</span>`,
            `<span class="context-neighbor">${escapeHtml(context.after)}</span>`
        ].join("");
    }

    function renderAnchoredContext(
        event: RevisionEvent,
        role: ManualRole,
        eventText: string,
        difference: DiffSegment[]
    ): string {
        const before = event.contextAnchors.find((anchor) => anchor.position === "before");
        const after = event.contextAnchors.find((anchor) => anchor.position === "after");
        const anchorText = (anchor: RevisionContextAnchor) => role === "my" ? anchor.myText : anchor.referenceText;
        const blocks: string[] = [];
        if (before) blocks.push(contextBlock("共同前文", anchorText(before), "context-anchor"));
        if (eventText) {
            blocks.push(`<span class="context-block context-focus">${renderDiff(difference)}</span>`);
        } else {
            const label = event.kind === "reference-added" ? "参考手册在此处新增内容" : "参考手册在此处删除内容";
            blocks.push(contextBlock("对应位置", label, "context-insertion"));
        }
        if (after) blocks.push(contextBlock("共同后文", anchorText(after), "context-anchor"));
        return blocks.join("");
    }

    function contextBlock(label: string, value: string, className: string): string {
        return `<span class="context-block ${className}"><span class="context-block-label">${escapeHtml(label)}</span>${escapeHtml(value)}</span>`;
    }

    function focusUnitIds(event: RevisionEvent, role: ManualRole): string[] {
        const eventUnitIds = role === "my" ? event.myUnitIds : event.referenceUnitIds;
        if (eventUnitIds.length) return eventUnitIds;
        return Array.from(new Set(event.contextAnchors.map((anchor) => role === "my" ? anchor.myUnitId : anchor.referenceUnitId)));
    }

    function selectionLocation(manual: LocalManual, event: RevisionEvent, role: ManualRole): string {
        const eventLocation = role === "my" ? event.myLocation : event.referenceLocation;
        if (eventLocation !== "无对应原文") return eventLocation;
        const contextUnits = unitsFor(manual, focusUnitIds(event, role));
        if (!contextUnits.length) return eventLocation;
        const first = contextUnits[0];
        const last = contextUnits[contextUnits.length - 1];
        const describe = (unit: ManualUnit) => unit.pageNumber ? `第 ${unit.pageNumber} 页` : `第 ${unit.index} 段`;
        const range = describe(first) === describe(last) ? describe(first) : `${describe(first)} - ${describe(last)}`;
        return `对应位置附近：${range}`;
    }

    function tokenDescription(event: RevisionEvent): string {
        const parts: string[] = [];
        if (event.myTokensOnly.length) parts.push(`我的手册独有：${event.myTokensOnly.join("、")}`);
        if (event.referenceTokensOnly.length) parts.push(`参考手册独有：${event.referenceTokensOnly.join("、")}`);
        return parts.join("；");
    }

    function renderEmptySelection(): void {
        element("selectionTitle").textContent = "选择一项修订事件";
        element("selectionReason").textContent = "新增和删除排在前面；一致内容默认不进入待办。";
        element("myChangeLocation").textContent = "";
        element("referenceChangeLocation").textContent = "";
        element("myChangeText").innerHTML = '<span class="missing-text">等待选择</span>';
        element("referenceChangeText").innerHTML = '<span class="missing-text">等待选择</span>';
        element("tokenChanges").textContent = "";
    }

    function pdfRange(role: ManualRole): { startPage: number | ""; endPage: number | "" } {
        const prefix = role === "my" ? "my" : "reference";
        const start = Number(input(`${prefix}StartPage`).value);
        const end = Number(input(`${prefix}EndPage`).value);
        return {
            startPage: Number.isFinite(start) && start > 0 ? Math.trunc(start) : "",
            endPage: Number.isFinite(end) && end > 0 ? Math.trunc(end) : ""
        };
    }

    function clearComparison(): void {
        stopWorker();
        state.comparison = null;
        state.visibleEvents = [];
        state.selectedId = "";
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
        }
    }

    function setMessage(message: string, tone: "secondary" | "info" | "success" | "danger"): void {
        const target = element("workspaceMessage");
        target.className = `alert alert-${tone} py-2 mb-3`;
        target.textContent = message;
    }

    function element(id: string): HTMLElement {
        const value = document.getElementById(id);
        if (!value) throw new Error(`页面缺少 ${id}。`);
        return value;
    }

    function input(id: string): HTMLInputElement {
        return element(id) as HTMLInputElement;
    }

    function button(id: string): HTMLButtonElement {
        return element(id) as HTMLButtonElement;
    }

    function escapeHtml(value: unknown): string {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    runtime.Workspace = { bind, state };
})();
