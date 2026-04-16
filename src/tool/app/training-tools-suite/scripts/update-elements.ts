(function () {
  const requireElement = window.TrainingToolsSuiteUi.requireElement;

  window.TrainingToolsSuiteUpdate.elements = {
    trainingFile: requireElement("trainingFile", HTMLInputElement),
    validityFile: requireElement("validityFile", HTMLInputElement),
    runButton: requireElement("runButton", HTMLButtonElement),
    exportButton: requireElement("exportButton", HTMLButtonElement),
    statusLine: requireElement("statusLine", HTMLElement),
    statsGrid: requireElement("statsGrid", HTMLElement),
    previewBody: requireElement("previewBody", HTMLTableSectionElement),
    skippedBody: requireElement("skippedBody", HTMLTableSectionElement)
  };
})();
