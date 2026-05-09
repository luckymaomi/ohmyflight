(function () {
  const runtime = window.SuperTrainingApp;
  const elements = runtime.elements;
  const controls = runtime.controls;
  const projects = runtime.projects;
  const workbenchController = runtime.workbenchController;
  const actions = runtime.actions;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    elements.workbookFile.addEventListener("change", actions.handleWorkbookChange);
    elements.updateValiditySheetSelect.addEventListener("change", controls.invalidateExportPreview);
    elements.scheduleValiditySheetSelect.addEventListener("change", controls.invalidateExportPreview);
    elements.planCheckValiditySheetSelect.addEventListener("change", controls.invalidateExportPreview);
    elements.expiryListValiditySheetSelect.addEventListener("change", controls.invalidateExportPreview);
    elements.updateMonthSelect.addEventListener("change", controls.invalidateExportPreview);
    elements.scheduleStartDateInput.addEventListener("change", controls.invalidateExportPreview);
    elements.scheduleEndDateInput.addEventListener("change", controls.invalidateExportPreview);
    elements.planCheckMonthInput.addEventListener("change", controls.invalidateExportPreview);
    elements.expiryListStartMonthInput.addEventListener("change", controls.invalidateExportPreview);
    elements.expiryListEndMonthInput.addEventListener("change", controls.invalidateExportPreview);
    elements.workbenchStartDateInput.addEventListener("change", workbenchController.handleWorkbenchRangeChange);
    elements.workbenchEndDateInput.addEventListener("change", workbenchController.handleWorkbenchRangeChange);
    elements.workbenchProjectSelect.addEventListener("change", workbenchController.handleWorkbenchFilterChange);
    elements.workbenchStatusSelect.addEventListener("change", workbenchController.handleWorkbenchFilterChange);
    elements.workbenchMonthSelect.addEventListener("change", workbenchController.handleWorkbenchFilterChange);
    elements.workbenchSearchInput.addEventListener("input", workbenchController.handleWorkbenchFilterChange);
    elements.updateProjectGroup.addEventListener("change", projects.handleUpdateProjectGroupChange);
    elements.scheduleProjectGroup.addEventListener("change", projects.handleScheduleProjectGroupChange);
    elements.planCheckProjectGroup.addEventListener("change", projects.handlePlanCheckProjectGroupChange);
    elements.expiryListProjectGroup.addEventListener("change", projects.handleExpiryListProjectGroupChange);
    elements.updateValidityButton.addEventListener("click", actions.handleUpdatePreview);
    elements.generateScheduleButton.addEventListener("click", actions.handleSchedulePreview);
    elements.planCheckButton.addEventListener("click", actions.handlePlanCheckPreview);
    elements.expiryListButton.addEventListener("click", actions.handleExpiryListPreview);
    elements.workbenchButton.addEventListener("click", actions.handleWorkbenchPreview);
    elements.exportWorkbenchSelectionButton.addEventListener("click", actions.handleExportWorkbenchSelection);
    elements.exportWorkbenchViewButton.addEventListener("click", actions.handleExportWorkbenchView);
    elements.exportButton.addEventListener("click", actions.handleExport);

    controls.initializeDefaultDates();
    projects.renderEmptyState();
  }
})();
