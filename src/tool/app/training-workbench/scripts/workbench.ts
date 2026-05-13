(function () {
  const ScheduleAssessment = window.TrainingTool.ScheduleAssessment;

  function buildWorkbench(analysis, options = {}) {
    return ScheduleAssessment.buildResult(analysis, options);
  }

  function filterWorkbenchRows(rows, filters = {}) {
    return ScheduleAssessment.filterRows(rows, filters);
  }

  function viewFromRows(baseResult, filters = {}) {
    return ScheduleAssessment.viewFromRows(baseResult, filters);
  }

  window.TrainingTool.Workbench = {
    buildWorkbench,
    filterWorkbenchRows,
    viewFromRows
  };
})();
