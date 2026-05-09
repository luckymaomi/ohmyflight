(function () {
  const Utils = window.SuperTraining.Utils;
  const runtime = window.SuperTrainingApp;
  const COPY = runtime.copy;
  const state = runtime.state;
  const elements = runtime.elements;
  const charts = runtime.charts;
  const resultTable = runtime.resultTable;
  const summaryView = runtime.summaryView;

  function renderWorkbookOverview() {
    if (!state.analysis) {
      elements.workbookOverview.innerHTML = `<div class="empty-block">${COPY.defaultOverview}</div>`;
      return;
    }

    elements.workbookOverview.innerHTML = `
      <div class="overview-grid">
        <article class="overview-item">
          <span>文件名</span>
          <strong>${Utils.escapeHtml(state.sourceFileName)}</strong>
        </article>
        <article class="overview-item">
          <span>人员信息表</span>
          <strong>${Utils.escapeHtml(state.analysis.peopleInfo.name)}</strong>
        </article>
        <article class="overview-item">
          <span>可识别培训类型</span>
          <strong>${state.analysis.projects.length}</strong>
        </article>
        <article class="overview-item">
          <span>可选月份</span>
          <strong>${state.analysis.availableMonths.length}</strong>
        </article>
        <article class="overview-item">
          <span>工作表总数</span>
          <strong>${state.analysis.sheetNames.length}</strong>
        </article>
        <article class="overview-item">
          <span>人员行数</span>
          <strong>${state.analysis.peopleInfo.rows.length}</strong>
        </article>
      </div>
    `;
  }

  function renderValiditySheetOptions() {
    const options = state.analysis
      ? [`<option value="${Utils.escapeHtml(state.analysis.peopleInfo.name)}">${Utils.escapeHtml(state.analysis.peopleInfo.name)}</option>`]
      : ['<option value="">请先导入文件</option>'];

    elements.updateValiditySheetSelect.innerHTML = options.join("");
    elements.updateValiditySheetSelect.disabled = !state.analysis;
  }

  function renderProjectCheckboxGroup(kind, projects, selectedNames) {
    const groupElements = getProjectGroupElements(kind);
    const { groupElement, selectAllElement, summaryElement, listElement } = groupElements;

    groupElement.classList.toggle("is-disabled", !state.analysis || !projects.length);

    if (!state.analysis) {
      selectAllElement.checked = false;
      selectAllElement.indeterminate = false;
      selectAllElement.disabled = true;
      summaryElement.textContent = "请先导入文件";
      listElement.innerHTML = '<div class="checkbox-empty">请先导入文件</div>';
      return;
    }

    if (!projects.length) {
      selectAllElement.checked = false;
      selectAllElement.indeterminate = false;
      selectAllElement.disabled = true;
      summaryElement.textContent = "当前没有可用培训类型";
      listElement.innerHTML = '<div class="checkbox-empty">当前没有可用培训类型</div>';
      return;
    }

    const selectedSet = new Set((selectedNames || []).map((value) => Utils.normalizeText(value)).filter(Boolean));
    const selectedCount = projects.filter((project) => selectedSet.has(project.canonical)).length;

    selectAllElement.disabled = false;
    selectAllElement.checked = selectedCount > 0 && selectedCount === projects.length;
    selectAllElement.indeterminate = selectedCount > 0 && selectedCount < projects.length;
    summaryElement.textContent = selectedCount
      ? `已选 ${selectedCount} 项，共 ${projects.length} 项`
      : `可选 ${projects.length} 项，可全选或多选`;

    listElement.innerHTML = projects.map((project) => {
      const checked = selectedSet.has(project.canonical);
      return `
        <label class="checkbox-chip${checked ? " is-checked" : ""}">
          <input type="checkbox" data-role="project" value="${Utils.escapeHtml(project.canonical)}"${checked ? " checked" : ""}>
          <span class="checkbox-chip-box" aria-hidden="true"></span>
          <span class="checkbox-chip-text">${Utils.escapeHtml(project.canonical)}</span>
        </label>
      `;
    }).join("");
  }

  function getProjectGroupElements(kind) {
    if (kind === "update") {
      return {
        groupElement: elements.updateProjectGroup,
        selectAllElement: elements.updateProjectSelectAll,
        summaryElement: elements.updateProjectSummary,
        listElement: elements.updateProjectList
      };
    }
    throw new Error(`未知培训类型选择区域：${kind}`);
  }

  function renderSelectOptions(selectElement, values, emptyLabel) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = [
      `<option value="">${Utils.escapeHtml(emptyLabel)}</option>`,
      ...(values || []).map((value) => `<option value="${Utils.escapeHtml(value)}">${Utils.escapeHtml(value)}</option>`)
    ].join("");
    if ((values || []).includes(currentValue)) {
      selectElement.value = currentValue;
    }
  }

  function renderWorkbenchFilterOptions(result) {
    const options = result && result.filterOptions
      ? result.filterOptions
      : { projects: [], statuses: [], months: [] };
    renderSelectOptions(elements.workbenchProjectSelect, options.projects, "全部项目");
    renderSelectOptions(elements.workbenchStatusSelect, options.statuses, "全部状态");
    renderSelectOptions(elements.workbenchMonthSelect, options.months, "全部月份");
  }

  function renderProjectCards() {
    if (!state.analysis || !state.analysis.projects.length) {
      elements.projectCards.innerHTML = `<div class="empty-block">${COPY.defaultProjectCards}</div>`;
      return;
    }

    elements.projectCards.innerHTML = state.analysis.projects.map((project) => {
      const recordedMonths = project.recordedMonths.length ? project.recordedMonths.join("、") : "无";
      const pendingMonths = project.pendingMonths.length ? project.pendingMonths.join("、") : "无";
      const monthBadges = project.availableMonths.length
        ? project.availableMonths.map((month) => `<span>${Utils.escapeHtml(month)}</span>`).join("")
        : "<span>暂无月份</span>";

      return `
        <article class="tool-card">
          <h3>${Utils.escapeHtml(project.canonical)}</h3>
          <ul>
            <li>人员信息列：${project.peopleHeader ? Utils.escapeHtml(project.peopleHeader) : "未识别"}</li>
            <li>项目 sheet：${project.sheetName ? Utils.escapeHtml(project.sheetName) : "未识别"}</li>
            <li>已录入行数：${Utils.escapeHtml(project.recordedRowCount)}</li>
            <li>未录入行数：${Utils.escapeHtml(project.pendingRowCount)}</li>
            <li>已录入月份：${Utils.escapeHtml(recordedMonths)}</li>
            <li>未录入月份：${Utils.escapeHtml(pendingMonths)}</li>
          </ul>
          <div class="month-badges">${monthBadges}</div>
        </article>
      `;
    }).join("");
  }

  function renderStats(cards) {
    if (!cards || !cards.length) {
      elements.statsGrid.innerHTML = `
        <article class="stat-card">
          <span class="muted">${COPY.defaultWaiting}</span>
          <strong>-</strong>
        </article>
      `;
      return;
    }

    elements.statsGrid.innerHTML = cards.map((card) => `
      <article class="stat-card">
        <span class="muted">${Utils.escapeHtml(card.label)}</span>
        <strong>${Utils.escapeHtml(card.value)}</strong>
      </article>
    `).join("");
  }

  function renderResultPlaceholders() {
    renderStats(null);
    charts.renderWorkbenchCharts(null);
    summaryView.renderWorkbenchSummary(null);
    resultTable.renderTable(elements.detailTableHead, elements.detailTableBody, [], [], COPY.defaultDetailTable);
    resultTable.renderTable(elements.skippedTableHead, elements.skippedTableBody, [], [], COPY.defaultSkippedTable);
    resultTable.renderSkippedSummary(0);
    elements.detailDetails.open = false;
    elements.detailTableTitle.textContent = "结果明细";
    elements.resultSummary.textContent = COPY.defaultResultSummary;
  }

  function renderActionResult(kind, result) {
    elements.resultSummary.textContent = result.summaryText;
    renderStats(result.statsCards);

    if (kind === "workbench") {
      charts.renderWorkbenchCharts(result.chartData);
      summaryView.renderWorkbenchSummary(result.summaryData);
      elements.detailTableTitle.textContent = "排班总览明细";
      resultTable.renderTable(
        elements.detailTableHead,
        elements.detailTableBody,
        result.displayColumns || result.detailColumns,
        resultTable.toWorkbenchDetailRows(result.detailRows),
        "当前没有需要展示的人员项目记录。"
      );
      resultTable.renderTable(
        elements.skippedTableHead,
        elements.skippedTableBody,
        result.skippedColumns,
        result.skippedRows,
        "排班总览没有额外提示。"
      );
      resultTable.renderSkippedSummary(0);
      elements.detailDetails.open = false;
      return;
    }

    summaryView.renderWorkbenchSummary(null);
    charts.renderWorkbenchCharts(null);

    if (kind === "validity") {
      elements.detailTableTitle.textContent = "更新明细";
      resultTable.renderTable(elements.detailTableHead, elements.detailTableBody, result.detailColumns, resultTable.toValidityDetailRows(result.detailRows), "本次没有生成更新明细。");
      resultTable.renderTable(elements.skippedTableHead, elements.skippedTableBody, result.skippedColumns, resultTable.toValiditySkippedRows(result.skippedRows), "本次没有跳过记录。");
      resultTable.renderSkippedSummary(result.skippedRows.length);
      return;
    }

    throw new Error(`未知结果类型：${kind}`);
  }

  runtime.renderers = {
    renderWorkbookOverview,
    renderValiditySheetOptions,
    renderProjectCheckboxGroup,
    renderWorkbenchFilterOptions,
    renderProjectCards,
    renderResultPlaceholders,
    renderActionResult
  };
})();
