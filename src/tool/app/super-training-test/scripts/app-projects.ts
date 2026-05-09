(function () {
  const COPY = window.SuperTrainingApp.copy;
  const runtime = window.SuperTrainingApp;
  const state = runtime.state;
  const elements = runtime.elements;
  const renderers = runtime.renderers;
  const selection = runtime.selection;
  const controls = runtime.controls;

  function renderProjectGroups() {
    const updateProjects = selection.getUpdateProjects();
    const scheduleProjects = selection.getScheduleProjects();
    const planCheckProjects = selection.getPlanCheckProjects();
    const expiryListProjects = selection.getExpiryListProjects();

    state.updateSelectedProjects = selection.normalizeSelectedProjects(state.updateSelectedProjects, updateProjects);
    state.scheduleSelectedProjects = selection.normalizeSelectedProjects(state.scheduleSelectedProjects, scheduleProjects);
    state.planCheckSelectedProjects = selection.normalizeSelectedProjects(state.planCheckSelectedProjects, planCheckProjects);
    state.expiryListSelectedProjects = selection.normalizeSelectedProjects(state.expiryListSelectedProjects, expiryListProjects);

    renderers.renderProjectCheckboxGroup("update", updateProjects, state.updateSelectedProjects);
    renderers.renderProjectCheckboxGroup("schedule", scheduleProjects, state.scheduleSelectedProjects);
    renderers.renderProjectCheckboxGroup("planCheck", planCheckProjects, state.planCheckSelectedProjects);
    renderers.renderProjectCheckboxGroup("expiryList", expiryListProjects, state.expiryListSelectedProjects);
  }

  function renderMonthSelect() {
    const selectedMonth = elements.updateMonthSelect.value;

    if (!state.analysis || !state.updateSelectedProjects.length) {
      elements.updateMonthSelect.innerHTML = '<option value="">请先选择培训类型</option>';
      elements.updateMonthSelect.disabled = true;
      controls.refreshButtons();
      return;
    }

    const commonMonths = selection.getCommonRecordedMonths(state.updateSelectedProjects);
    if (!commonMonths.length) {
      elements.updateMonthSelect.innerHTML = '<option value="">所选培训类型没有共同已录入月份</option>';
      elements.updateMonthSelect.disabled = true;
      controls.refreshButtons();
      return;
    }

    elements.updateMonthSelect.innerHTML = [
      '<option value="">请选择已录入月份</option>',
      ...commonMonths.map((monthKey) => `<option value="${monthKey}">${monthKey}</option>`)
    ].join("");

    if (commonMonths.includes(selectedMonth)) {
      elements.updateMonthSelect.value = selectedMonth;
    }

    elements.updateMonthSelect.disabled = false;
    controls.refreshButtons();
  }

  function renderEmptyState() {
    state.updateSelectedProjects = [];
    state.scheduleSelectedProjects = [];
    state.planCheckSelectedProjects = [];
    state.expiryListSelectedProjects = [];
    state.workbenchResult = null;
    state.workbenchView = null;
    state.workbenchSelection = null;
    elements.workbenchSearchInput.value = "";
    renderers.renderWorkbookOverview();
    renderers.renderValiditySheetOptions();
    renderProjectGroups();
    renderMonthSelect();
    renderers.renderWorkbenchFilterOptions(null);
    renderers.renderProjectCards();
    renderers.renderResultPlaceholders();
    controls.clearPendingExport();
    controls.refreshButtons();
  }

  function handleUpdateProjectGroupChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const updateProjects = selection.getUpdateProjects();
    if (target.dataset.role === "select-all") {
      state.updateSelectedProjects = target.checked
        ? updateProjects.map((project) => project.canonical)
        : [];
    } else if (target.dataset.role === "project") {
      state.updateSelectedProjects = selection.getCheckedProjectValues(elements.updateProjectList);
    } else {
      return;
    }

    renderers.renderProjectCheckboxGroup("update", updateProjects, state.updateSelectedProjects);
    renderMonthSelect();
    controls.invalidateExportPreview();
  }

  function handleScheduleProjectGroupChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const scheduleProjects = selection.getScheduleProjects();
    if (target.dataset.role === "select-all") {
      state.scheduleSelectedProjects = target.checked
        ? scheduleProjects.map((project) => project.canonical)
        : [];
    } else if (target.dataset.role === "project") {
      state.scheduleSelectedProjects = selection.getCheckedProjectValues(elements.scheduleProjectList);
    } else {
      return;
    }

    renderers.renderProjectCheckboxGroup("schedule", scheduleProjects, state.scheduleSelectedProjects);
    controls.invalidateExportPreview();
  }

  function handlePlanCheckProjectGroupChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const planCheckProjects = selection.getPlanCheckProjects();
    if (target.dataset.role === "select-all") {
      state.planCheckSelectedProjects = target.checked
        ? planCheckProjects.map((project) => project.canonical)
        : [];
    } else if (target.dataset.role === "project") {
      state.planCheckSelectedProjects = selection.getCheckedProjectValues(elements.planCheckProjectList);
    } else {
      return;
    }

    renderers.renderProjectCheckboxGroup("planCheck", planCheckProjects, state.planCheckSelectedProjects);
    controls.invalidateExportPreview();
  }

  function handleExpiryListProjectGroupChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const expiryListProjects = selection.getExpiryListProjects();
    if (target.dataset.role === "select-all") {
      state.expiryListSelectedProjects = target.checked
        ? expiryListProjects.map((project) => project.canonical)
        : [];
    } else if (target.dataset.role === "project") {
      state.expiryListSelectedProjects = selection.getCheckedProjectValues(elements.expiryListProjectList);
    } else {
      return;
    }

    renderers.renderProjectCheckboxGroup("expiryList", expiryListProjects, state.expiryListSelectedProjects);
    controls.invalidateExportPreview();
  }

  runtime.projects = {
    renderProjectGroups,
    renderMonthSelect,
    renderEmptyState,
    handleUpdateProjectGroupChange,
    handleScheduleProjectGroupChange,
    handlePlanCheckProjectGroupChange,
    handleExpiryListProjectGroupChange
  };
})();
