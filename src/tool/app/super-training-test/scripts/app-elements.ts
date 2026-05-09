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
    planCheckValiditySheetSelect: requireElement("planCheckValiditySheetSelect", HTMLSelectElement),
    planCheckProjectGroup: requireElement("planCheckProjectGroup", HTMLElement),
    planCheckProjectSelectAll: requireElement("planCheckProjectSelectAll", HTMLInputElement),
    planCheckProjectSummary: requireElement("planCheckProjectSummary", HTMLElement),
    planCheckProjectList: requireElement("planCheckProjectList", HTMLElement),
    planCheckMonthInput: requireElement("planCheckMonthInput", HTMLInputElement),
    expiryListValiditySheetSelect: requireElement("expiryListValiditySheetSelect", HTMLSelectElement),
    expiryListProjectGroup: requireElement("expiryListProjectGroup", HTMLElement),
    expiryListProjectSelectAll: requireElement("expiryListProjectSelectAll", HTMLInputElement),
    expiryListProjectSummary: requireElement("expiryListProjectSummary", HTMLElement),
    expiryListProjectList: requireElement("expiryListProjectList", HTMLElement),
    expiryListStartMonthInput: requireElement("expiryListStartMonthInput", HTMLInputElement),
    expiryListEndMonthInput: requireElement("expiryListEndMonthInput", HTMLInputElement),
    workbenchProjectSelect: requireElement("workbenchProjectSelect", HTMLSelectElement),
    workbenchStatusSelect: requireElement("workbenchStatusSelect", HTMLSelectElement),
    workbenchMonthSelect: requireElement("workbenchMonthSelect", HTMLSelectElement),
    workbenchSearchInput: requireElement("workbenchSearchInput", HTMLInputElement),
    workbenchStartDateInput: requireElement("workbenchStartDateInput", HTMLInputElement),
    workbenchEndDateInput: requireElement("workbenchEndDateInput", HTMLInputElement),
    workbenchStatusChart: requireElement("workbenchStatusChart", HTMLElement),
    workbenchProjectChart: requireElement("workbenchProjectChart", HTMLElement),
    workbenchMonthChart: requireElement("workbenchMonthChart", HTMLElement),
    exportWorkbenchSelectionButton: requireElement("exportWorkbenchSelectionButton", HTMLButtonElement),
    exportWorkbenchViewButton: requireElement("exportWorkbenchViewButton", HTMLButtonElement),
    updateValidityButton: requireElement("updateValidityButton", HTMLButtonElement),
    generateScheduleButton: requireElement("generateScheduleButton", HTMLButtonElement),
    planCheckButton: requireElement("planCheckButton", HTMLButtonElement),
    expiryListButton: requireElement("expiryListButton", HTMLButtonElement),
    workbenchButton: requireElement("workbenchButton", HTMLButtonElement),
    exportButton: requireElement("exportButton", HTMLButtonElement),
    resultSummary: requireElement("resultSummary", HTMLElement),
    statsGrid: requireElement("statsGrid", HTMLElement),
    workbenchProjectSummaryBody: requireElement("workbenchProjectSummaryBody", HTMLTableSectionElement),
    workbenchSelectedPeopleTitle: requireElement("workbenchSelectedPeopleTitle", HTMLElement),
    workbenchSelectedPeopleIntro: requireElement("workbenchSelectedPeopleIntro", HTMLElement),
    workbenchSelectedPeople: requireElement("workbenchSelectedPeople", HTMLElement),
    detailDetails: requireElement("detailDetails", HTMLDetailsElement),
    detailSummaryLabel: requireElement("detailSummaryLabel", HTMLElement),
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
