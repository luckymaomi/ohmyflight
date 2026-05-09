(function () {
  const ScheduleAssessment = window.SuperTraining.ScheduleAssessment;

  function buildWorkbench(analysis, options = {}) {
    return ScheduleAssessment.buildResult(analysis, options);
  }

  function filterWorkbenchRows(rows, filters = {}) {
    return ScheduleAssessment.filterRows(rows, filters);
  }

  function viewFromRows(baseResult, filters = {}) {
    return ScheduleAssessment.viewFromRows(baseResult, filters);
  }

  window.SuperTraining.Workbench = {
    buildWorkbench,
    filterWorkbenchRows,
    viewFromRows
  };
})();
