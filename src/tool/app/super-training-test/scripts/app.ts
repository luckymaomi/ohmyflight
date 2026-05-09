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
    elements.updateMonthSelect.addEventListener("change", controls.invalidateExportPreview);
    elements.workbenchStartDateInput.addEventListener("change", workbenchController.handleWorkbenchRangeChange);
    elements.workbenchEndDateInput.addEventListener("change", workbenchController.handleWorkbenchRangeChange);
    elements.workbenchProjectSelect.addEventListener("change", workbenchController.handleWorkbenchFilterChange);
    elements.workbenchStatusSelect.addEventListener("change", workbenchController.handleWorkbenchFilterChange);
    elements.workbenchMonthSelect.addEventListener("change", workbenchController.handleWorkbenchFilterChange);
    elements.workbenchSearchInput.addEventListener("input", workbenchController.handleWorkbenchFilterChange);
    elements.updateProjectGroup.addEventListener("change", projects.handleUpdateProjectGroupChange);
    elements.updateValidityButton.addEventListener("click", actions.handleUpdatePreview);
    elements.workbenchButton.addEventListener("click", actions.handleWorkbenchPreview);
    elements.exportWorkbenchSelectionButton.addEventListener("click", actions.handleExportWorkbenchSelection);
    elements.exportWorkbenchViewButton.addEventListener("click", actions.handleExportWorkbenchView);
    elements.exportButton.addEventListener("click", actions.handleExport);

    controls.initializeDefaultDates();
    projects.renderEmptyState();
  }
})();
