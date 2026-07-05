(function () {
    const runtime = window.PdfStampApp || (window.PdfStampApp = {});

    function init(): void {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '../../../libs/pdf.worker.min.js';
        const context: PdfStampAppContext = runtime.AppContext.createAppContext();
        runtime.UploadActions.bindUploads(context);
        runtime.RuleActions.bindRuleActions(context);
        runtime.CanvasActions.bindCanvasActions(context);
        runtime.ExportActions.bindExport(context);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
