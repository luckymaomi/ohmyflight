(function () {
  const Utils = window.SuperTraining.Utils;
  const Scanner = window.SuperTraining.Scanner;
  const Validity = window.SuperTraining.Validity;
  const Schedule = window.SuperTraining.Schedule;
  const ReportSheet = window.SuperTraining.ReportSheet;
  const GeneratedSheet = window.SuperTraining.GeneratedSheet;
  const ResultStatus = window.SuperTraining.ResultStatus;
  const runtime = window.SuperTrainingApp;
  const COPY = runtime.copy;
  const state = runtime.state;
  const elements = runtime.elements;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    elements.workbookFile.addEventListener("change", handleWorkbookChange);
    elements.updateValiditySheetSelect.addEventListener("change", invalidateExportPreview);
    elements.scheduleValiditySheetSelect.addEventListener("change", invalidateExportPreview);
    elements.updateMonthSelect.addEventListener("change", invalidateExportPreview);
    elements.scheduleStartDateInput.addEventListener("change", invalidateExportPreview);
    elements.scheduleEndDateInput.addEventListener("change", invalidateExportPreview);
    elements.updateProjectGroup.addEventListener("change", handleUpdateProjectGroupChange);
    elements.scheduleProjectGroup.addEventListener("change", handleScheduleProjectGroupChange);
    elements.updateValidityButton.addEventListener("click", handleUpdatePreview);
    elements.generateScheduleButton.addEventListener("click", handleSchedulePreview);
    elements.exportButton.addEventListener("click", handleExport);
    elements.scheduleStartDateInput.value = todayString();
    elements.scheduleEndDateInput.value = monthEndString();

    renderEmptyState();
  }

  function todayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function monthEndString() {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;
  }

  function setStatus(message, isError = false) {
    elements.statusLine.textContent = message;
    elements.statusLine.classList.toggle("is-error", Boolean(isError));
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

  function invalidateExportPreview() {
    clearPendingExport();
    refreshButtons();
  }

  function refreshButtons() {
    const canUpdate = Boolean(state.analysis)
      && Boolean(elements.updateValiditySheetSelect.value)
      && state.updateSelectedProjects.length > 0
      && Boolean(elements.updateMonthSelect.value)
      && !state.busy;

    const canSchedule = Boolean(state.analysis)
      && Boolean(elements.scheduleValiditySheetSelect.value)
      && state.scheduleSelectedProjects.length > 0
      && Boolean(elements.scheduleStartDateInput.value)
      && Boolean(elements.scheduleEndDateInput.value)
      && !state.busy;

    elements.updateValidityButton.disabled = !canUpdate;
    elements.generateScheduleButton.disabled = !canSchedule;
    elements.exportButton.disabled = !state.pendingExport || state.busy;
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
    elements.scheduleValiditySheetSelect.innerHTML = options.join("");
    elements.updateValiditySheetSelect.disabled = !state.analysis;
    elements.scheduleValiditySheetSelect.disabled = !state.analysis;
  }

  function renderProjectCheckboxGroup(kind, projects, selectedNames) {
    const isUpdate = kind === "update";
    const groupElement = isUpdate ? elements.updateProjectGroup : elements.scheduleProjectGroup;
    const selectAllElement = isUpdate ? elements.updateProjectSelectAll : elements.scheduleProjectSelectAll;
    const summaryElement = isUpdate ? elements.updateProjectSummary : elements.scheduleProjectSummary;
    const listElement = isUpdate ? elements.updateProjectList : elements.scheduleProjectList;

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

    const normalizedSelected = normalizeSelectedProjects(selectedNames, projects);
    const projectCount = projects.length;
    const selectedCount = normalizedSelected.length;

    selectAllElement.disabled = false;
    selectAllElement.checked = selectedCount > 0 && selectedCount === projectCount;
    selectAllElement.indeterminate = selectedCount > 0 && selectedCount < projectCount;
    summaryElement.textContent = selectedCount
      ? `已选 ${selectedCount} 项，共 ${projectCount} 项`
      : `可选 ${projectCount} 项，可全选或多选`;

    listElement.innerHTML = projects.map((project) => {
      const checked = normalizedSelected.includes(project.canonical);
      return `
        <label class="checkbox-chip${checked ? " is-checked" : ""}">
          <input type="checkbox" data-role="project" value="${Utils.escapeHtml(project.canonical)}"${checked ? " checked" : ""}>
          <span class="checkbox-chip-box" aria-hidden="true"></span>
          <span class="checkbox-chip-text">${Utils.escapeHtml(project.canonical)}</span>
        </label>
      `;
    }).join("");
  }

  function renderProjectGroups() {
    const updateProjects = getUpdateProjects();
    const scheduleProjects = getScheduleProjects();

    state.updateSelectedProjects = normalizeSelectedProjects(state.updateSelectedProjects, updateProjects);
    state.scheduleSelectedProjects = normalizeSelectedProjects(state.scheduleSelectedProjects, scheduleProjects);

    renderProjectCheckboxGroup("update", updateProjects, state.updateSelectedProjects);
    renderProjectCheckboxGroup("schedule", scheduleProjects, state.scheduleSelectedProjects);
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

  function renderMonthSelect() {
    const selectedMonth = elements.updateMonthSelect.value;

    if (!state.analysis || !state.updateSelectedProjects.length) {
      elements.updateMonthSelect.innerHTML = '<option value="">请先选择培训类型</option>';
      elements.updateMonthSelect.disabled = true;
      refreshButtons();
      return;
    }

    const commonMonths = getCommonRecordedMonths(state.updateSelectedProjects);
    if (!commonMonths.length) {
      elements.updateMonthSelect.innerHTML = '<option value="">所选培训类型没有共同已录入月份</option>';
      elements.updateMonthSelect.disabled = true;
      refreshButtons();
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
    refreshButtons();
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

  function getTableVariant(columns) {
    const signature = columns.join("|");
    if (signature === "项目|员工号|姓名|原有效期|状态|开始日期|结束日期|说明") {
      return "result-table-schedule";
    }
    if (signature === "项目|项目 sheet|项目行号|员工号|姓名|旧有效期|新有效期|判断|处理结果|说明") {
      return "result-table-validity";
    }
    if (signature === "项目|姓名|状态|原因") {
      return "result-table-skipped";
    }
    return "";
  }

  function getTableVariantNormalized(columns) {
    const signature = (columns || []).join("|");
    if (signature === "项目|员工号|姓名|原有效期|轻重缓急|状态|开始日期|结束日期|说明") {
      return "result-table-schedule";
    }
    if (signature === "项目|项目 sheet|项目行号|员工号|姓名|旧有效期|新有效期|判断|处理结果|说明") {
      return "result-table-validity";
    }
    if (signature === "项目|姓名|状态|原因") {
      return "result-table-skipped";
    }
    return getTableVariant(columns || []);
  }

  function renderTable(headElement, bodyElement, columns, rows, emptyText) {
    const tableElement = headElement.closest("table");
    if (tableElement) {
      tableElement.classList.remove("result-table-schedule", "result-table-validity", "result-table-skipped");
      const variantClassName = getTableVariantNormalized(columns || []);
      if (variantClassName) {
        tableElement.classList.add(variantClassName);
      }
    }

    if (!columns || !columns.length) {
      headElement.innerHTML = "";
      bodyElement.innerHTML = `<tr><td class="empty-block" colspan="1">${Utils.escapeHtml(emptyText)}</td></tr>`;
      return;
    }

    headElement.innerHTML = `<tr>${columns.map((column) => `<th>${Utils.escapeHtml(column)}</th>`).join("")}</tr>`;

    if (!rows.length) {
      bodyElement.innerHTML = `<tr><td class="empty-block" colspan="${columns.length}">${Utils.escapeHtml(emptyText)}</td></tr>`;
      return;
    }

    bodyElement.innerHTML = rows.map((row) => `
      <tr>${row.map((cell) => `<td>${renderTableCell(cell)}</td>`).join("")}</tr>
    `).join("");
  }

  function renderTableCell(cell) {
    if (cell && typeof cell === "object" && cell.type === "badge") {
      return `<span class="badge ${Utils.escapeHtml(cell.tone || "info")}">${Utils.escapeHtml(cell.text)}</span>`;
    }
    return Utils.escapeHtml(cell);
  }

  function renderSkippedSummary(count) {
    elements.skippedSummaryLabel.textContent = count
      ? `跳过 / 提示：${count} 条（默认折叠）`
      : "跳过 / 提示（默认折叠）";
    elements.skippedDetails.open = false;
  }

  function renderResultPlaceholders() {
    renderStats(null);
    renderTable(elements.detailTableHead, elements.detailTableBody, [], [], COPY.defaultDetailTable);
    renderTable(elements.skippedTableHead, elements.skippedTableBody, [], [], COPY.defaultSkippedTable);
    renderSkippedSummary(0);
    elements.detailTableTitle.textContent = "结果明细";
    elements.resultSummary.textContent = COPY.defaultResultSummary;
  }

  function renderEmptyState() {
    state.updateSelectedProjects = [];
    state.scheduleSelectedProjects = [];
    renderWorkbookOverview();
    renderValiditySheetOptions();
    renderProjectGroups();
    renderMonthSelect();
    renderProjectCards();
    renderResultPlaceholders();
    clearPendingExport();
    refreshButtons();
  }

  function toValidityDetailRows(rows) {
    return rows.map((row) => [
      row.projectName,
      row.sheetName,
      row.rowNumber,
      row.employeeId,
      row.name,
      row.oldExpiry,
      row.newExpiry,
      ResultStatus.makeBadgeCell(row.judgement, ResultStatus.badgeToneForUpdateJudgement(row.judgement)),
      ResultStatus.makeBadgeCell(row.result, ResultStatus.badgeToneForUpdateResult(row.result)),
      row.reason
    ]);
  }

  function toValiditySkippedRows(rows) {
    return rows.map((row) => [
      row.projectName,
      row.name,
      ResultStatus.makeBadgeCell(row.status, ResultStatus.badgeToneForSkippedStatus(row.status)),
      row.reason
    ]);
  }

  function toScheduleDetailRows(rows) {
    return rows.map((row) => [
      row.projectName,
      row.employeeId,
      row.name,
      row.oldExpiry,
      ResultStatus.makeBadgeCell(row.status, ResultStatus.badgeToneForScheduleStatus(row.status)),
      row.startDate,
      row.endDate,
      row.reason
    ]);
  }

  function toScheduleDetailRowsWithPriority(rows) {
    return rows.map((row) => [
      row.projectName,
      row.employeeId,
      row.name,
      row.oldExpiry,
      ResultStatus.makeBadgeCell(row.priorityLabel, ResultStatus.badgeToneForSchedulePriority(row.priorityLabel)),
      ResultStatus.makeBadgeCell(row.status, ResultStatus.badgeToneForScheduleStatus(row.status)),
      row.startDate,
      row.endDate,
      row.reason
    ]);
  }

  function toScheduleSkippedRows(rows) {
    return rows.map((row) => [
      row.projectName,
      row.name,
      ResultStatus.makeBadgeCell(row.status, ResultStatus.badgeToneForSkippedStatus(row.status)),
      row.reason
    ]);
  }

  function renderActionResult(kind, result) {
    elements.resultSummary.textContent = result.summaryText;
    renderStats(result.statsCards);

    if (kind === "validity") {
      elements.detailTableTitle.textContent = "更新明细";
      renderTable(
        elements.detailTableHead,
        elements.detailTableBody,
        result.detailColumns,
        toValidityDetailRows(result.detailRows),
        "本次没有生成更新明细。"
      );
      renderTable(
        elements.skippedTableHead,
        elements.skippedTableBody,
        result.skippedColumns,
        toValiditySkippedRows(result.skippedRows),
        "本次没有跳过记录。"
      );
      renderSkippedSummary(result.skippedRows.length);
      return;
    }

    elements.detailTableTitle.textContent = "预排明细";
    renderTable(
      elements.detailTableHead,
      elements.detailTableBody,
      result.detailColumns,
      toScheduleDetailRowsWithPriority(result.detailRows),
      "本次没有命中需要预排的人员。"
    );
    renderTable(
      elements.skippedTableHead,
      elements.skippedTableBody,
      result.skippedColumns,
      toScheduleSkippedRows(result.skippedRows),
      "本次没有额外提示。"
    );
    renderSkippedSummary(result.skippedRows.length);
  }

  async function handleWorkbookChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const file = target.files && target.files[0];
    if (!file) {
      state.sourceFileName = "";
      state.workbook = null;
      state.analysis = null;
      renderEmptyState();
      setStatus(COPY.defaultStatus);
      return;
    }

    setBusy(true);
    setStatus("正在读取总培训表并识别工作表...");

    try {
      const workbook = await Scanner.readWorkbookFile(file);
      const analysis = Scanner.analyzeWorkbook(workbook);

      state.sourceFileName = file.name;
      state.workbook = workbook;
      state.analysis = analysis;
      state.updateSelectedProjects = [];
      state.scheduleSelectedProjects = [];

      renderWorkbookOverview();
      renderValiditySheetOptions();
      renderProjectGroups();
      renderMonthSelect();
      renderProjectCards();
      renderResultPlaceholders();
      clearPendingExport();
      refreshButtons();

      setStatus(`识别完成：人员信息表“${analysis.peopleInfo.name}”，共识别 ${analysis.projects.length} 个项目 sheet，${analysis.availableMonths.length} 个可选月份。`);
    } catch (error) {
      state.sourceFileName = "";
      state.workbook = null;
      state.analysis = null;
      renderEmptyState();
      setStatus(error.message || "工作簿读取失败。", true);
    } finally {
      setBusy(false);
    }
  }

  function handleUpdateProjectGroupChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const updateProjects = getUpdateProjects();
    if (target.dataset.role === "select-all") {
      state.updateSelectedProjects = target.checked
        ? updateProjects.map((project) => project.canonical)
        : [];
    } else if (target.dataset.role === "project") {
      state.updateSelectedProjects = getCheckedProjectValues(elements.updateProjectList);
    } else {
      return;
    }

    renderProjectCheckboxGroup("update", updateProjects, state.updateSelectedProjects);
    renderMonthSelect();
    invalidateExportPreview();
  }

  function handleScheduleProjectGroupChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const scheduleProjects = getScheduleProjects();
    if (target.dataset.role === "select-all") {
      state.scheduleSelectedProjects = target.checked
        ? scheduleProjects.map((project) => project.canonical)
        : [];
    } else if (target.dataset.role === "project") {
      state.scheduleSelectedProjects = getCheckedProjectValues(elements.scheduleProjectList);
    } else {
      return;
    }

    renderProjectCheckboxGroup("schedule", scheduleProjects, state.scheduleSelectedProjects);
    invalidateExportPreview();
  }

  function validateUpdateSelection() {
    if (!state.analysis) {
      setStatus("请先导入总培训表文件。", true);
      return null;
    }
    if (!elements.updateValiditySheetSelect.value) {
      setStatus("请先确认人员信息表。", true);
      return null;
    }
    if (!state.updateSelectedProjects.length) {
      setStatus("请先选择培训类型。", true);
      return null;
    }
    if (!elements.updateMonthSelect.value) {
      setStatus("请先选择已录入月份。", true);
      return null;
    }
    return {
      projectNames: [...state.updateSelectedProjects],
      monthKey: elements.updateMonthSelect.value
    };
  }

  function validateScheduleSelection() {
    if (!state.analysis) {
      setStatus("请先导入总培训表文件。", true);
      return null;
    }
    if (!elements.scheduleValiditySheetSelect.value) {
      setStatus("请先确认人员信息表。", true);
      return null;
    }
    if (!state.scheduleSelectedProjects.length) {
      setStatus("请先选择培训类型。", true);
      return null;
    }
    const cutoffDate = Utils.parseDate(elements.scheduleEndDateInput.value);
    if (!cutoffDate) {
      setStatus("请先选择有效期截止日期。", true);
      return null;
    }
    return {
      projectNames: [...state.scheduleSelectedProjects],
      cutoffDate
    };
  }

  function validateScheduleRangeSelection() {
    if (!state.analysis) {
      setStatus("请先导入总培训表文件。", true);
      return null;
    }
    if (!elements.scheduleValiditySheetSelect.value) {
      setStatus("请先确认人员信息表。", true);
      return null;
    }
    if (!state.scheduleSelectedProjects.length) {
      setStatus("请先选择培训类型。", true);
      return null;
    }

    const stageStart = Utils.parseDate(elements.scheduleStartDateInput.value);
    const stageEnd = Utils.parseDate(elements.scheduleEndDateInput.value);
    if (!stageStart) {
      setStatus("请先选择预排开始日期。", true);
      return null;
    }
    if (!stageEnd) {
      setStatus("请先选择预排结束日期。", true);
      return null;
    }
    if (stageStart > stageEnd) {
      setStatus("预排开始日期不能晚于结束日期。", true);
      return null;
    }

    return {
      projectNames: [...state.scheduleSelectedProjects],
      stageStart,
      stageEnd
    };
  }

  async function handleUpdatePreview() {
    const selection = validateUpdateSelection();
    if (!selection) return;

    setBusy(true);
    clearPendingExport();
    setStatus("正在生成有效期更新预览...");

    try {
      const workbook = Utils.deepClone(state.workbook) as SuperTrainingWorkbook;
      const analysis = Scanner.analyzeWorkbook(workbook);
      const result = Validity.buildValidityUpdate(workbook, analysis, selection.projectNames, selection.monthKey);

      ReportSheet.attachUpdateReportSheet(
        workbook,
        analysis,
        result,
        selection.projectNames,
        [selection.monthKey]
      );

      renderActionResult("validity", result);
      state.pendingExport = workbook;
      state.pendingExportName = Utils.buildOutputFileName(state.sourceFileName, "更新有效期");
      state.pendingExportLabel = "有效期更新预览";
      elements.exportButton.textContent = "导出有效期更新结果 Excel";
      setStatus("有效期更新预览已生成，确认无误后可导出 Excel。");
    } catch (error) {
      clearPendingExport();
      setStatus(error.message || "生成有效期更新预览失败。", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedulePreview() {
    const selection = validateScheduleRangeSelection();
    if (!selection) return;

    setBusy(true);
    clearPendingExport();
    setStatus("正在生成预排班预览...");

    try {
      const workbook = Utils.deepClone(state.workbook) as SuperTrainingWorkbook;
      const analysis = Scanner.analyzeWorkbook(workbook);
      const result = Schedule.buildSchedulePlan(
        analysis,
        selection.projectNames,
        selection.stageStart,
        selection.stageEnd
      );

      renderActionResult("schedule", result);

      if (!result.projectSheets.length) {
        setStatus("预排班预览已生成，但当前没有命中需要导出的预排结果。");
        return;
      }

      GeneratedSheet.attachGeneratedSheets(
        workbook,
        result,
        [`${Utils.formatDate(selection.stageStart)} ~ ${Utils.formatDate(selection.stageEnd)}`]
      );
      state.pendingExport = workbook;
      state.pendingExportName = Utils.buildOutputFileName(state.sourceFileName, "生成预排班");
      state.pendingExportLabel = "预排班预览";
      elements.exportButton.textContent = "导出预排班结果 Excel";
      setStatus("预排班预览已生成，确认无误后可导出 Excel。");
    } catch (error) {
      clearPendingExport();
      setStatus(error.message || "生成预排班预览失败。", true);
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    if (!state.pendingExport) {
      setStatus("请先生成预览，再导出 Excel。", true);
      return;
    }

    try {
      window.XLSX.writeFile(state.pendingExport, state.pendingExportName);
      setStatus(`${state.pendingExportLabel}已导出：${state.pendingExportName}`);
    } catch (error) {
      setStatus(error.message || "导出 Excel 失败。", true);
    }
  }
})();
