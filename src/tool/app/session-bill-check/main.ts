(function () {
    const runtime = window as SessionBillRuntime;
    const namespace = runtime.SessionBillCheck || (runtime.SessionBillCheck = {});

    function runCompare(context: SessionBillAppContext): void {
        if (!context.state.sessionAnalysis || !context.state.billAnalysis) {
            context.state.result = null;
            namespace.View.renderAll(context);
            return;
        }
        context.state.result = context.logic.compareEntries(context.state.sessionAnalysis.entries, context.state.billAnalysis.entries, {
            sessionSheetName: context.state.sessionAnalysis.sheetName,
            billSheetNames: context.state.billAnalysis.sheetNames
        });
        context.state.selectedKey = context.state.result.rows.find((row) => row.status !== "一致")?.key || context.state.result.rows[0]?.key || "";
        context.setStatus("核对完成。", "success");
        namespace.View.renderAll(context);
    }

    async function handleSessionFile(context: SessionBillAppContext, file: File): Promise<void> {
        context.state.sessionWorkbook = await context.readWorkbook(file);
        context.state.sessionFileName = file.name;
        context.state.sessionAnalysis = context.logic.analyzeSessionWorkbook(context.state.sessionWorkbook);
        runCompare(context);
    }

    async function handleBillFile(context: SessionBillAppContext, file: File): Promise<void> {
        context.state.billWorkbook = await context.readWorkbook(file);
        context.state.billFileName = file.name;
        context.state.billAnalysis = context.logic.analyzeBillWorkbook(context.state.billWorkbook);
        runCompare(context);
    }

    function bindFileInput(context: SessionBillAppContext, inputId: string, handler: (file: File) => Promise<void>): void {
        context.getElement<HTMLInputElement>(inputId).addEventListener("change", (event) => {
            const input = event.target as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            context.setStatus(`正在读取 ${file.name}...`);
            handler(file).catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                context.setStatus(message, "danger");
                namespace.View.renderAll(context);
            });
        });
    }

    function exportWorkbook(context: SessionBillAppContext): void {
        if (!context.state.result) return;
        runtime.XLSX.writeFile(context.logic.buildExportWorkbook(context.state.result), context.logic.buildOutputFileName());
    }

    function bindEvents(context: SessionBillAppContext): void {
        bindFileInput(context, "sessionFile", file => handleSessionFile(context, file));
        bindFileInput(context, "billFile", file => handleBillFile(context, file));
        context.getElement<HTMLSelectElement>("statusFilter").addEventListener("change", (event) => {
            context.state.filter = (event.target as HTMLSelectElement).value;
            namespace.View.renderTable(context);
        });
        context.getElement<HTMLButtonElement>("exportButton").addEventListener("click", () => exportWorkbook(context));
    }

    document.addEventListener("DOMContentLoaded", () => {
        const context: SessionBillAppContext = namespace.AppContext.createAppContext();
        namespace.context = context;
        bindEvents(context);
        namespace.View.renderAll(context);
    });
})();
