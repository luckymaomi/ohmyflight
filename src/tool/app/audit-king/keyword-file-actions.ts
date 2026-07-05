(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function bindKeywordImportExport(context: AuditKingAppContext): void {
        const importInput = context.getElement<HTMLInputElement>("keywordImportInput");
        context.getElement<HTMLButtonElement>("importKeywordsBtn").addEventListener("click", () => {
            importInput.click();
        });
        importInput.addEventListener("change", async () => {
            const file = importInput.files?.[0];
            importInput.value = "";
            if (!file) return;
            try {
                const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
                const imported = context.runtime.KeywordImportExport.parseKeywordWorkbook(workbook);
                context.runtime.State.replaceKeywords(context.state, imported);
                context.recomputeSearch();
                context.refresh(`已导入 ${context.state.keywords.length} 个关键词。`, "success");
            } catch (error) {
                context.runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
            }
        });
        context.getElement<HTMLButtonElement>("exportKeywordsBtn").addEventListener("click", () => {
            if (!context.state.keywords.length) {
                context.runtime.View.renderStatus("没有可导出的关键词。", "error");
                return;
            }
            const workbook = context.runtime.KeywordImportExport.buildKeywordWorkbook(context.state.keywords);
            XLSX.writeFile(workbook, `审计之王_关键词_${context.formatLocalDate(new Date())}.xlsx`);
        });
    }

    runtime.KeywordFileActions = {
        bindKeywordImportExport
    };
})();
