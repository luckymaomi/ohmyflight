(function () {
  const runtime = window.SuperTrainingApp || (window.SuperTrainingApp = {} as SuperTrainingAppRuntime);

  function requireElement<T extends Element>(id: string, Type: { new(): T }): T {
    const element = document.getElementById(id);
    if (!(element instanceof Type)) {
      throw new Error(`页面缺少必要元素：${id}`);
    }
    return element;
  }

  runtime.elements = {
    workbookFile: requireElement("workbookFile", HTMLInputElement),
    workbookOverview: requireElement("workbookOverview", HTMLElement),
    statusLine: requireElement("statusLine", HTMLElement),
    updateValiditySheetSelect: requireElement("updateValiditySheetSelect", HTMLSelectElement),
    updateProjectGroup: requireElement("updateProjectGroup", HTMLElement),
    updateProjectSelectAll: requireElement("updateProjectSelectAll", HTMLInputElement),
    updateProjectSummary: requireElement("updateProjectSummary", HTMLElement),
    updateProjectList: requireElement("updateProjectList", HTMLElement),
    updateMonthSelect: requireElement("updateMonthSelect", HTMLSelectElement),
    scheduleValiditySheetSelect: requireElement("scheduleValiditySheetSelect", HTMLSelectElement),
    scheduleProjectGroup: requireElement("scheduleProjectGroup", HTMLElement),
    scheduleProjectSelectAll: requireElement("scheduleProjectSelectAll", HTMLInputElement),
    scheduleProjectSummary: requireElement("scheduleProjectSummary", HTMLElement),
    scheduleProjectList: requireElement("scheduleProjectList", HTMLElement),
    scheduleStartDateInput: requireElement("scheduleStartDateInput", HTMLInputElement),
    scheduleEndDateInput: requireElement("scheduleEndDateInput", HTMLInputElement),
    updateValidityButton: requireElement("updateValidityButton", HTMLButtonElement),
    generateScheduleButton: requireElement("generateScheduleButton", HTMLButtonElement),
    exportButton: requireElement("exportButton", HTMLButtonElement),
    resultSummary: requireElement("resultSummary", HTMLElement),
    statsGrid: requireElement("statsGrid", HTMLElement),
    detailTableTitle: requireElement("detailTableTitle", HTMLElement),
    detailTableHead: requireElement("detailTableHead", HTMLTableSectionElement),
    detailTableBody: requireElement("detailTableBody", HTMLTableSectionElement),
    skippedDetails: requireElement("skippedDetails", HTMLDetailsElement),
    skippedSummaryLabel: requireElement("skippedSummaryLabel", HTMLElement),
    skippedTableHead: requireElement("skippedTableHead", HTMLTableSectionElement),
    skippedTableBody: requireElement("skippedTableBody", HTMLTableSectionElement),
    projectCards: requireElement("projectCards", HTMLElement)
  };
})();
