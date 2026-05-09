(function () {
  const Utils = window.SuperTraining.Utils;
  const runtime = window.SuperTrainingApp;
  const elements = runtime.elements;
  let workbenchStatusChart = null;
  let workbenchProjectChart = null;
  let workbenchMonthChart = null;

  function getEcharts() {
    return window.echarts || null;
  }

  function getOrCreateChart(element, currentChart) {
    const echarts = getEcharts();
    if (!echarts) return null;
    return currentChart || echarts.init(element);
  }

  function renderChartEmpty(element, message) {
    element.innerHTML = `<div class="empty-block">${Utils.escapeHtml(message)}</div>`;
  }

  function renderWorkbenchCharts(chartData) {
    const echarts = getEcharts();
    if (!echarts) {
      renderChartEmpty(elements.workbenchStatusChart, "图表库未加载。");
      renderChartEmpty(elements.workbenchProjectChart, "图表库未加载。");
      renderChartEmpty(elements.workbenchMonthChart, "图表库未加载。");
      return;
    }

    const statusRows = chartData && chartData.statusRows ? chartData.statusRows : [];
    const projectRows = chartData && chartData.projectRows ? chartData.projectRows : [];
    const monthRows = chartData && chartData.monthRows ? chartData.monthRows : [];

    workbenchStatusChart = getOrCreateChart(elements.workbenchStatusChart, workbenchStatusChart);
    workbenchProjectChart = getOrCreateChart(elements.workbenchProjectChart, workbenchProjectChart);
    workbenchMonthChart = getOrCreateChart(elements.workbenchMonthChart, workbenchMonthChart);

    workbenchStatusChart.setOption({
      tooltip: { trigger: "item" },
      legend: { bottom: 0, left: "center" },
      series: [{
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "42%"],
        avoidLabelOverlap: true,
        data: statusRows
      }]
    });

    workbenchProjectChart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0 },
      grid: { top: 44, right: 18, bottom: 12, left: 86, containLabel: true },
      xAxis: {
        type: "value",
        minInterval: 1
      },
      yAxis: {
        type: "category",
        data: projectRows.map((row) => row.projectName),
        axisLabel: {
          interval: 0,
          fontSize: 11,
          width: 76,
          overflow: "truncate"
        }
      },
      series: [
        { name: "已过期", type: "bar", stack: "total", data: projectRows.map((row) => row.expired) },
        { name: "已过期已排补训", type: "bar", stack: "total", data: projectRows.map((row) => row.expiredScheduled) },
        { name: "必须排", type: "bar", stack: "total", data: projectRows.map((row) => row.must) },
        { name: "已排未覆盖", type: "bar", stack: "total", data: projectRows.map((row) => row.uncoveredScheduled) },
        { name: "推荐排", type: "bar", stack: "total", data: projectRows.map((row) => row.recommended) },
        { name: "异常", type: "bar", stack: "total", data: projectRows.map((row) => row.abnormal) }
      ]
    });

    workbenchMonthChart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { top: 0 },
      grid: { top: 44, right: 18, bottom: 12, left: 72, containLabel: true },
      xAxis: {
        type: "value",
        minInterval: 1
      },
      yAxis: {
        type: "category",
        data: monthRows.map((row) => row.label),
        axisLabel: {
          interval: 0,
          fontSize: 11
        }
      },
      series: [
        { name: "已过期", type: "bar", stack: "total", data: monthRows.map((row) => row.expired) },
        { name: "已过期已排补训", type: "bar", stack: "total", data: monthRows.map((row) => row.expiredScheduled) },
        { name: "必须排", type: "bar", stack: "total", data: monthRows.map((row) => row.must) },
        { name: "已排未覆盖", type: "bar", stack: "total", data: monthRows.map((row) => row.uncoveredScheduled) },
        { name: "推荐排", type: "bar", stack: "total", data: monthRows.map((row) => row.recommended) },
        { name: "异常", type: "bar", stack: "total", data: monthRows.map((row) => row.abnormal) }
      ]
    });

    workbenchStatusChart.resize();
    workbenchProjectChart.resize();
    workbenchMonthChart.resize();
  }

  runtime.charts = {
    renderWorkbenchCharts
  };
})();
