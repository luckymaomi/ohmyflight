(function () {
  const Utils = window.SuperTraining.Utils;
  const runtime = window.SuperTrainingApp;
  const state = runtime.state;
  const elements = runtime.elements;

  function normalizeSelectedProjects(selectedNames, projects) {
    const selectedSet = new Set(
      (selectedNames || [])
        .map((value) => Utils.normalizeText(value))
        .filter(Boolean)
    );
    return projects
      .map((project) => project.canonical)
      .filter((projectName) => selectedSet.has(projectName));
  }

  function getUpdateProjects() {
    if (!state.analysis) return [];
    return state.analysis.projects.filter(
      (project) => project.peopleColumnIndex >= 0 && project.recordedInfo && project.recordedInfo.rows.length
    );
  }

  function getScheduleProjects() {
    if (!state.analysis) return [];
    return state.analysis.projects.filter((project) => project.peopleColumnIndex >= 0);
  }

  function getPlanCheckProjects() {
    if (!state.analysis) return [];
    return state.analysis.projects.filter((project) => project.peopleColumnIndex >= 0);
  }

  function getExpiryListProjects() {
    if (!state.analysis) return [];
    return state.analysis.projects.filter((project) => project.peopleColumnIndex >= 0);
  }

  function getCheckedProjectValues(listElement) {
    return Array.from(listElement.querySelectorAll('input[data-role="project"]:checked'))
      .map((input) => Utils.normalizeText((input as HTMLInputElement).value))
      .filter(Boolean);
  }

  function getCommonRecordedMonths(projectNames) {
    if (!state.analysis || !projectNames.length) return [];

    const selectedProjects = projectNames
      .map((projectName) => state.analysis.projectMap.get(projectName))
      .filter(Boolean);

    if (!selectedProjects.length) return [];

    let commonMonths = [...selectedProjects[0].recordedMonths];
    for (let index = 1; index < selectedProjects.length; index += 1) {
      const monthSet = new Set(selectedProjects[index].recordedMonths);
      commonMonths = commonMonths.filter((monthKey) => monthSet.has(monthKey));
    }
    return Utils.sortMonthKeys(commonMonths);
  }

  function getWorkbenchFilters() {
    return {
      projects: elements.workbenchProjectSelect.value ? [elements.workbenchProjectSelect.value] : [],
      statuses: elements.workbenchStatusSelect.value ? [elements.workbenchStatusSelect.value] : [],
      months: elements.workbenchMonthSelect.value ? [elements.workbenchMonthSelect.value] : [],
      searchText: elements.workbenchSearchInput.value
    };
  }

  function getWorkbenchRange() {
    const stageStart = Utils.parseDate(elements.workbenchStartDateInput.value);
    const stageEnd = Utils.parseDate(elements.workbenchEndDateInput.value);
    if (!stageStart || !stageEnd || stageStart > stageEnd) {
      return null;
    }
    return { stageStart, stageEnd };
  }

  runtime.selection = {
    normalizeSelectedProjects,
    getUpdateProjects,
    getScheduleProjects,
    getPlanCheckProjects,
    getExpiryListProjects,
    getCheckedProjectValues,
    getCommonRecordedMonths,
    getWorkbenchFilters,
    getWorkbenchRange
  };
})();
