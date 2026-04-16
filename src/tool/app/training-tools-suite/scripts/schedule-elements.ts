(function () {
  const requireElement = window.TrainingToolsSuiteUi.requireElement;

  window.TrainingToolsSuiteSchedule.elements = {
    ruleFile: requireElement("ruleFile", HTMLInputElement),
    validityFile: requireElement("validityFile", HTMLInputElement),
    projectSelect: requireElement("projectSelect", HTMLSelectElement),
    stageStartInput: requireElement("stageStartInput", HTMLInputElement),
    stageEndInput: requireElement("stageEndInput", HTMLInputElement),
    runButton: requireElement("runButton", HTMLButtonElement),
    exportButton: requireElement("exportButton", HTMLButtonElement),
    statusLine: requireElement("statusLine", HTMLElement),
    ruleSummary: requireElement("ruleSummary", HTMLElement),
    statsGrid: requireElement("statsGrid", HTMLElement),
    expiredBody: requireElement("expiredBody", HTMLTableSectionElement),
    windowBody: requireElement("windowBody", HTMLTableSectionElement),
    stageDueBody: requireElement("stageDueBody", HTMLTableSectionElement),
    missingBody: requireElement("missingBody", HTMLTableSectionElement),
    ignoredBody: requireElement("ignoredBody", HTMLTableSectionElement)
  };
})();
