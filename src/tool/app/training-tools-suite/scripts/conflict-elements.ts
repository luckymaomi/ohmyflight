(function () {
  const requireElement = window.TrainingToolsSuiteUi.requireElement;

  window.TrainingToolsSuiteConflict.elements = {
    sourceFile: requireElement("sourceFile", HTMLInputElement),
    runButton: requireElement("runButton", HTMLButtonElement),
    exportButton: requireElement("exportButton", HTMLButtonElement),
    statusLine: requireElement("statusLine", HTMLElement),
    statsGrid: requireElement("statsGrid", HTMLElement),
    conflictBody: requireElement("conflictBody", HTMLTableSectionElement),
    skippedBody: requireElement("skippedBody", HTMLTableSectionElement)
  };
})();
