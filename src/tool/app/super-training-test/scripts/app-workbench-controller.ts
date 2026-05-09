(function () {
  const Utils = window.SuperTraining.Utils;
  const Workbench = window.SuperTraining.Workbench;
  const runtime = window.SuperTrainingApp;
  const state = runtime.state;
  const elements = runtime.elements;
  const renderers = runtime.renderers;
  const selection = runtime.selection;
  const controls = runtime.controls;

  function buildCurrentWorkbenchResult(analysis) {
    const range = selection.getWorkbenchRange();
    if (!range) {
      throw new Error("请确认排班总览评估日期区间，开始日期不能晚于结束日期。");
    }
    return Workbench.buildWorkbench(analysis, {
      today: range.stageStart,
      stageEnd: range.stageEnd
    });
  }

  function renderWorkbenchView() {
    if (!state.workbenchResult) return null;
    const view = Workbench.viewFromRows(state.workbenchResult, selection.getWorkbenchFilters());
    state.workbenchView = view;
    state.workbenchSelection = null;
    renderers.renderWorkbenchFilterOptions(view);
    renderers.renderActionResult("workbench", view);
    controls.refreshButtons();
    return view;
  }

  function handleWorkbenchRangeChange() {
    controls.clearPendingExport();
    if (!state.analysis) {
      controls.refreshButtons();
      return;
    }

    try {
      state.workbenchResult = buildCurrentWorkbenchResult(state.analysis);
      renderWorkbenchView();
      controls.setStatus("排班总览评估区间已更新。");
    } catch (error) {
      state.workbenchResult = null;
      renderers.renderResultPlaceholders();
      controls.setStatus(error.message || "排班总览评估区间无效。", true);
      controls.refreshButtons();
    }
  }

  function handleWorkbenchFilterChange() {
    if (!state.workbenchResult) return;
    renderWorkbenchView();
    controls.setStatus("排班总览筛选已更新。");
  }

  runtime.workbenchController = {
    buildCurrentWorkbenchResult,
    renderWorkbenchView,
    handleWorkbenchRangeChange,
    handleWorkbenchFilterChange
  };
})();
