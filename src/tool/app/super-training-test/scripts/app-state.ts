(function () {
  const runtime = window.SuperTrainingApp || (window.SuperTrainingApp = {} as SuperTrainingAppRuntime);

  runtime.state = {
    sourceFileName: "",
    workbook: null,
    analysis: null,
    busy: false,
    pendingExport: null,
    pendingExportName: "",
    pendingExportLabel: "",
    workbenchResult: null,
    workbenchView: null,
    workbenchSelection: null,
    scheduledDistribution: null,
    crmAnnualResult: null,
    updateSelectedProjects: []
  };
})();
