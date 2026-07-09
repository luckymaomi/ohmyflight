(function () {
    const runtime = window.ProofKing || (window.ProofKing = {});

    const state: ProofKingState = {
        sourceDocument: null,
        targetDocument: null,
        result: null,
        selectedReviewId: "",
        message: "",
        messageType: "info"
    };

    function getElement<T extends HTMLElement>(id: string): T {
        return runtime.View.getElement(id) as T;
    }

    function getPageRange(prefix: string): { startPage: number | ""; endPage: number | "" } {
        const start = Number(getElement<HTMLInputElement>(`${prefix}StartPage`).value);
        const end = Number(getElement<HTMLInputElement>(`${prefix}EndPage`).value);
        return {
            startPage: Number.isFinite(start) && start > 0 ? Math.trunc(start) : "",
            endPage: Number.isFinite(end) && end > 0 ? Math.trunc(end) : ""
        };
    }

    async function readInput(role: "source" | "target"): Promise<void> {
        const input = getElement<HTMLInputElement>(role === "source" ? "sourceInput" : "targetInput");
        const file = input.files?.[0];
        if (!file) return;
        const prefix = role === "source" ? "source" : "target";
        const documentItem = await runtime.Reader.readManualFile(file, role, getPageRange(prefix));
        if (role === "source") {
            state.sourceDocument = documentItem;
        } else {
            state.targetDocument = documentItem;
        }
        state.result = null;
        state.selectedReviewId = "";
        state.message = `${documentItem.name} 读取完成。`;
        state.messageType = "success";
        getElement<HTMLButtonElement>("exportBtn").disabled = true;
        runtime.View.render(state);
    }

    function bind(): void {
        getElement<HTMLInputElement>("sourceInput").addEventListener("change", async () => {
            await runWithErrorHandling(() => readInput("source"));
        });
        getElement<HTMLInputElement>("targetInput").addEventListener("change", async () => {
            await runWithErrorHandling(() => readInput("target"));
        });
        getElement<HTMLButtonElement>("compareBtn").addEventListener("click", async () => {
            await runWithErrorHandling(async () => {
                if (!state.sourceDocument || !state.targetDocument) {
                    throw new Error("请先上传基准手册 A 和待校对手册 B。");
                }
                state.message = "正在比对...";
                state.messageType = "info";
                runtime.View.render(state);
                await new Promise((resolve) => setTimeout(resolve, 10));
                state.result = runtime.CompareModel.compareDocuments(state.sourceDocument, state.targetDocument);
                state.selectedReviewId = runtime.View.getFirstReviewId(state.result);
                state.message = `比对完成：A 覆盖率 ${runtime.ExcelExport.formatPercent(state.result.summary.coverageRate)}，B 新增 ${state.result.summary.added} 条。`;
                state.messageType = "success";
                runtime.View.render(state);
                await renderSelectedPreview();
            });
        });
        getElement<HTMLElement>("reviewList").addEventListener("click", async (event) => {
            const target = event.target as HTMLElement;
            const card = target.closest("[data-review-id]") as HTMLElement | null;
            if (!card) return;
            state.selectedReviewId = card.dataset.reviewId || "";
            runtime.View.render(state);
            await renderSelectedPreview();
        });
        getElement<HTMLButtonElement>("exportBtn").addEventListener("click", () => {
            if (!state.result) return;
            runtime.ExcelExport.exportWorkbook(state.result);
        });
        runtime.View.render(state);
    }

    async function runWithErrorHandling(action: () => Promise<void>): Promise<void> {
        try {
            await action();
        } catch (error) {
            state.message = error instanceof Error ? error.message : String(error);
            state.messageType = "error";
            runtime.View.render(state);
        }
    }

    async function renderSelectedPreview(): Promise<void> {
        const container = document.getElementById("pdfPreview");
        if (!(container instanceof HTMLElement)) return;
        await runtime.Preview.renderPdfPreview(runtime.View.getSelectedRow(state), state.result, container);
    }

    runtime.Actions = {
        bind,
        state
    };
})();
