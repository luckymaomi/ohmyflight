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
    updateSelectedProjects: [],
    scheduleSelectedProjects: []
  };
})();
