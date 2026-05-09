(function () {
  const runtime = window.SuperTrainingApp;
  const COPY = runtime.copy;
  const state = runtime.state;
  const elements = runtime.elements;

  function todayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function nextMonthEndString() {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;
  }

  function initializeDefaultDates() {
    elements.workbenchStartDateInput.value = todayString();
    elements.workbenchEndDateInput.value = nextMonthEndString();
  }

  function setStatus(message, isError = false) {
    elements.statusLine.textContent = message;
    elements.statusLine.classList.toggle("is-error", Boolean(isError));
  }

  function refreshButtons() {
    const canUpdate = Boolean(state.analysis)
      && Boolean(elements.updateValiditySheetSelect.value)
      && state.updateSelectedProjects.length > 0
      && Boolean(elements.updateMonthSelect.value)
      && !state.busy;

    const canWorkbench = Boolean(state.analysis) && !state.busy;
    const canExportWorkbenchView = Boolean(state.workbenchView && state.workbenchView.detailRows && state.workbenchView.detailRows.length) && !state.busy;
    const canExportWorkbenchSelection = Boolean(state.workbenchSelection && state.workbenchSelection.rows && state.workbenchSelection.rows.length) && !state.busy;

    elements.updateValidityButton.disabled = !canUpdate;
    elements.workbenchButton.disabled = !canWorkbench;
    elements.exportWorkbenchViewButton.disabled = !canExportWorkbenchView;
    elements.exportWorkbenchSelectionButton.disabled = !canExportWorkbenchSelection;
    elements.workbenchProjectSelect.disabled = !state.workbenchResult || state.busy;
    elements.workbenchStatusSelect.disabled = !state.workbenchResult || state.busy;
    elements.workbenchMonthSelect.disabled = !state.workbenchResult || state.busy;
    elements.workbenchSearchInput.disabled = !state.workbenchResult || state.busy;
    elements.workbenchStartDateInput.disabled = !state.analysis || state.busy;
    elements.workbenchEndDateInput.disabled = !state.analysis || state.busy;
    elements.exportButton.disabled = !state.pendingExport || state.busy;
  }

  function setBusy(busy) {
    state.busy = busy;
    elements.workbookFile.disabled = busy;
    refreshButtons();
  }

  function clearPendingExport() {
    state.pendingExport = null;
    state.pendingExportName = "";
    state.pendingExportLabel = "";
    elements.exportButton.textContent = COPY.defaultExportButton;
  }

  function setPendingExport(workbook, fileName, label, buttonText) {
    state.pendingExport = workbook;
    state.pendingExportName = fileName;
    state.pendingExportLabel = label;
    elements.exportButton.textContent = buttonText;
  }

  function invalidateExportPreview() {
    clearPendingExport();
    refreshButtons();
  }

  runtime.controls = {
    initializeDefaultDates,
    setStatus,
    setBusy,
    clearPendingExport,
    setPendingExport,
    invalidateExportPreview,
    refreshButtons
  };
})();
