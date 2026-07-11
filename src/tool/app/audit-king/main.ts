(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function init(): void {
        const context: AuditKingAppContext = runtime.AppContext.createAppContext();
        runtime.UploadActions.bindUploads(context);
        runtime.CheckItemActions.bindCheckItemActions(context);
        runtime.MatchActions.bindMatchActions(context);
        runtime.AuditActions.bindAuditActions(context);
        runtime.WorkbookActions.bindWorkbookActions(context);
        runtime.FolderScriptActions.bindFolderScriptActions(context);
        runtime.PdfLocatorActions.bindPdfLocatorActions(context);
        context.refresh("上传检查单和手册后，创建检查项并填写关键词开始检索。");
    }

    document.addEventListener("DOMContentLoaded", init);
})();
