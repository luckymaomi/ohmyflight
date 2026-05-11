(function () {
  const Utils = window.SuperTraining.Utils;
  const WorkbenchStatus = window.SuperTraining.WorkbenchStatus;
  const runtime = window.SuperTrainingApp;
  const elements = runtime.elements;
  let workbenchStatusChart = null;
  let workbenchProjectChart = null;
  let workbenchMonthChart = null;
  let scheduledDistributionDateChart = null;
  let crmParticipationChart = null;
  let crmMonthlyChart = null;

  function getEcharts() {
    return window.echarts || null;
  }

  function getOrCreateChart(element, currentChart) {
    const echarts = getEcharts();
    if (!echarts) return null;
    return currentChart || echarts.init(element);
  }

  function getCssColor(name, fallback) {
    const value = window.getComputedStyle
      ? window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      : "";
    return value || fallback;
  }

  function getChartColors() {
    return {
      info: getCssColor("--st-info-soft", "#eff6ff"),
      ok: getCssColor("--st-success-soft", "#b7efc5"),
      danger: getCssColor("--st-danger-soft", "#ffc9c7")
    };
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
    const visibleSeries = WorkbenchStatus.VISIBLE_STATUS_FIELDS.map((item) => ({
      name: item.status,
      field: item.field
    }));

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
      series: visibleSeries.map((item) => ({
        name: item.name,
        type: "bar",
        stack: "total",
        data: projectRows.map((row) => row[item.field])
      }))
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
      series: visibleSeries.map((item) => ({
        name: item.name,
        type: "bar",
        stack: "total",
        data: monthRows.map((row) => row[item.field])
      }))
    });

    workbenchStatusChart.resize();
    workbenchProjectChart.resize();
    workbenchMonthChart.resize();
  }

  function renderScheduledDistributionCharts(summary) {
    const echarts = getEcharts();
    if (!echarts) {
      renderChartEmpty(elements.scheduledDistributionDateChart, "图表库未加载。");
      return;
    }

    const dateRows = summary && summary.dateRows ? summary.dateRows : [];

    scheduledDistributionDateChart = getOrCreateChart(elements.scheduledDistributionDateChart, scheduledDistributionDateChart);

    scheduledDistributionDateChart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 20, right: 38, bottom: 42, left: 96, containLabel: true },
      dataZoom: [
        { type: "slider", yAxisIndex: 0, right: 4, width: 14, start: 0, end: Math.min(100, dateRows.length ? 18 / dateRows.length * 100 : 100) },
        { type: "inside", yAxisIndex: 0 }
      ],
      xAxis: { type: "value", minInterval: 1 },
      yAxis: {
        type: "category",
        data: dateRows.map((row) => row.label),
        axisLabel: { interval: 0, fontSize: 11 }
      },
      series: [{
        name: "已排培训",
        type: "bar",
        label: {
          show: true,
          position: "right"
        },
        data: dateRows.map((row) => row.total)
      }]
    });

    scheduledDistributionDateChart.resize();
  }

  function renderCrmCharts(result) {
    const echarts = getEcharts();
    if (!echarts) {
      renderChartEmpty(elements.crmParticipationChart, "图表库未加载。");
      renderChartEmpty(elements.crmMonthlyChart, "图表库未加载。");
      return;
    }

    const participationRows = result && result.participationRows ? result.participationRows : [];
    const monthlyRows = result && result.monthlyRows ? result.monthlyRows : [];

    crmParticipationChart = getOrCreateChart(elements.crmParticipationChart, crmParticipationChart);
    crmMonthlyChart = getOrCreateChart(elements.crmMonthlyChart, crmMonthlyChart);
    const chartColors = getChartColors();
    const colorForCrmKind = (kind) => (kind === "missing" ? chartColors.danger : chartColors.ok);

    crmParticipationChart.setOption({
      tooltip: { trigger: "item" },
      legend: { bottom: 0, left: "center" },
      series: [{
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "42%"],
        startAngle: 90,
        clockwise: false,
        avoidLabelOverlap: true,
        label: {
          show: false
        },
        labelLine: {
          show: false
        },
        data: participationRows.map((row) => ({
          name: row.name,
          value: row.value,
          itemStyle: { color: colorForCrmKind(row.kind) }
        })),
        colorBy: "data"
      }]
    });

    crmMonthlyChart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 20, right: 28, bottom: 36, left: 48, containLabel: true },
      xAxis: {
        type: "category",
        data: monthlyRows.map((row) => row.label),
        axisLabel: { interval: 0, fontSize: 11 }
      },
      yAxis: { type: "value", minInterval: 1 },
      series: [{
        name: "人数",
        type: "bar",
        label: {
          show: true,
          position: "top"
        },
        itemStyle: {
          color(params) {
            const item = monthlyRows[params.dataIndex];
            return colorForCrmKind(item && item.kind);
          }
        },
        data: monthlyRows.map((row) => row.count)
      }]
    });

    crmParticipationChart.resize();
    crmMonthlyChart.resize();
  }

  runtime.charts = {
    renderWorkbenchCharts,
    renderScheduledDistributionCharts,
    renderCrmCharts
  };
})();
