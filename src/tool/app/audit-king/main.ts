(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function init(): void {
        const context: AuditKingAppContext = runtime.AppContext.createAppContext();
        runtime.UploadActions.bindUploads(context);
        runtime.KeywordActions.bindKeywordActions(context);
        runtime.MatchActions.bindMatchActions(context);
        runtime.EvidenceActions.bindEvidenceEditing(context);
        runtime.EvidenceActions.bindEvidenceImportExport(context);
        runtime.KeywordFileActions.bindKeywordImportExport(context);
        context.refresh("上传检查单和手册后，手动添加关键词开始检索。");
    }

    document.addEventListener("DOMContentLoaded", init);
})();
