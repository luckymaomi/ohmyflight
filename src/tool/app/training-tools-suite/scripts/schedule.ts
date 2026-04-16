(function () {
  const tools = window.TrainingTools;
  const runtime = window.TrainingToolsSuiteSchedule;
  const state = runtime.state;
  const elements = runtime.elements;

  function setStatus(message, isError = false) {
    elements.statusLine.textContent = message;
    elements.statusLine.classList.toggle("is-error", Boolean(isError));
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

  function badgeClass(value) {
    if (value === "已过期" || value === "30天内到期") return "danger";
    if (value === "60天内到期" || value === "命中窗口") return "warn";
    if (value === "90天内到期" || value === "本阶段到期" || value === "缺少旧有效期") return "info";
    return "ok";
  }

  function renderProjectOptions() {
    const rules = state.enabledRules;
    if (!rules.length) {
      elements.projectSelect.innerHTML = '<option value="">请先导入规则表</option>';
      elements.projectSelect.disabled = true;
      renderRuleSummary();
      return;
    }

    elements.projectSelect.disabled = false;
    elements.projectSelect.innerHTML = rules
      .map((rule) => `<option value="${tools.escapeHtml(rule.canonical)}">${tools.escapeHtml(rule.canonical)} | ${tools.escapeHtml(rule.ruleType)} | ${tools.escapeHtml(tools.formatRuleDuration(rule))}</option>`)
      .join("");
    renderRuleSummary();
  }

  function renderRuleSummary() {
    const selected = state.ruleMap.get(elements.projectSelect.value);
    if (!selected) {
      elements.ruleSummary.innerHTML = '<div class="empty-block">导入规则表后，这里会显示所选项目的规则摘要。</div>';
      return;
    }

    elements.ruleSummary.innerHTML = `
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>项目</th>
            <th>规则 / 有效期</th>
            <th>窗口</th>
            <th>到期取整</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${tools.escapeHtml(selected.canonical)}</td>
            <td>${tools.escapeHtml(`${selected.ruleType} / ${tools.formatRuleDuration(selected)}`)}</td>
            <td>${tools.escapeHtml(tools.formatWindowText(selected))}</td>
            <td>${tools.escapeHtml(selected.rounding)}</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  function renderStats(stats) {
    const values = [
      stats.checked,
      stats.schedule,
      stats.expired,
      stats.windowHits,
      stats.stageDue,
      stats.priority30,
      stats.priority60,
      stats.priority90,
      stats.missingExpiry,
      stats.ignored
    ];

    Array.from(elements.statsGrid.children).forEach((card, index) => {
      const node = card.querySelector("strong");
      if (node) node.textContent = String(values[index] || 0);
    });
  }

  function renderRows(target, rows, emptyText) {
    if (!rows.length) {
      target.innerHTML = `<tr><td colspan="9" class="empty-block">${tools.escapeHtml(emptyText)}</td></tr>`;
      return;
    }

    target.innerHTML = rows.map((row) => `
      <tr>
        <td>${tools.escapeHtml(row.rank || "")}</td>
        <td>${tools.escapeHtml(row.employeeId)}</td>
        <td>${tools.escapeHtml(row.name)}</td>
        <td>${tools.escapeHtml(row.oldExpiry)}</td>
        <td>${tools.escapeHtml(row.windowStart)}</td>
        <td>${tools.escapeHtml(row.windowEnd)}</td>
        <td>${row.priorityLabel
          ? `<span class="badge ${badgeClass(row.priorityLabel)}">${tools.escapeHtml(row.priorityLabel)}</span>`
          : "-"}</td>
        <td><span class="badge ${badgeClass(row.status)}">${tools.escapeHtml(row.status)}</span></td>
        <td>${tools.escapeHtml(row.reason)}</td>
      </tr>
    `).join("");
  }

  function resetView() {
    renderStats({
      checked: 0,
      schedule: 0,
      expired: 0,
      windowHits: 0,
      stageDue: 0,
      priority30: 0,
      priority60: 0,
      priority90: 0,
      missingExpiry: 0,
      ignored: 0
    });
    renderRows(elements.expiredBody, [], "暂无已过期记录");
    renderRows(elements.windowBody, [], "暂无命中窗口记录");
    renderRows(elements.stageDueBody, [], "暂无本阶段到期记录");
    renderRows(elements.missingBody, [], "暂无缺少旧有效期的记录");
    renderRows(elements.ignoredBody, [], "暂无未命中窗口或阶段外未到期记录");
  }

  function exportResult() {
    if (!state.result) return;
    const rule = state.ruleMap.get(state.result.projectName);
    const workbook = tools.buildScheduleWorkbook(state.result, rule);
    const fileName = tools.buildOutputFileName(state.result.projectName, "预排名单");
    window.XLSX.writeFile(workbook, fileName);
    setStatus(`已导出结果文件：${fileName}`);
  }

  async function loadRuleFile() {
    const file = elements.ruleFile.files[0];
    if (!file) {
      state.ruleMap = new Map();
      state.enabledRules = [];
      state.ruleSheetName = "";
      renderProjectOptions();
      return;
    }

    setStatus("正在识别规则表工作表...");
    try {
      const workbook = await tools.readWorkbookFile(file);
      const info = tools.readRuleWorkbook(workbook);
      state.ruleSheetName = info.sheetName;
      state.ruleMap = info.ruleMap;
      state.enabledRules = info.enabledRules;
      renderProjectOptions();
      setStatus(`规则表识别完成：工作表“${info.sheetName}”，共识别 ${info.enabledRules.length} 个启用项目。`);
    } catch (error) {
      state.ruleMap = new Map();
      state.enabledRules = [];
      state.ruleSheetName = "";
      renderProjectOptions();
      setStatus(error.message || "规则表读取失败。", true);
    }
  }

  async function runSchedule() {
    const ruleFile = elements.ruleFile.files[0];
    const validityFile = elements.validityFile.files[0];
    const projectName = elements.projectSelect.value;
    const stageStart = tools.parseDate(elements.stageStartInput.value);
    const stageEnd = tools.parseDate(elements.stageEndInput.value);

    if (!ruleFile) {
      setStatus("请先导入规则表文件。", true);
      return;
    }
    if (!validityFile) {
      setStatus("请先导入有效期表文件。", true);
      return;
    }
    if (!projectName) {
      setStatus("请先选择项目。", true);
      return;
    }
    if (!stageStart || !stageEnd) {
      setStatus("请先选择完整的预排开始日期和结束日期。", true);
      return;
    }
    if (stageStart > stageEnd) {
      setStatus("预排开始日期不能晚于结束日期。", true);
      return;
    }

    elements.runButton.disabled = true;
    elements.exportButton.disabled = true;
    setStatus("正在读取规则表和有效期表，生成预排名单...");

    try {
      const [ruleWorkbook, validityWorkbook] = await Promise.all([
        tools.readWorkbookFile(ruleFile),
        tools.readWorkbookFile(validityFile)
      ]);

      const result = tools.buildScheduleResult(ruleWorkbook, validityWorkbook, projectName, stageStart, stageEnd);
      state.validitySheetName = result.sheetSummary.validitySheetName;
      state.result = result;

      renderStats(result.stats);
      renderRows(elements.expiredBody, result.expiredRows, "暂无已过期记录");
      renderRows(elements.windowBody, result.windowRows, "暂无命中窗口记录");
      renderRows(elements.stageDueBody, result.stageDueRows, "暂无本阶段到期记录");
      renderRows(elements.missingBody, result.missingExpiry, "暂无缺少旧有效期的记录");
      renderRows(elements.ignoredBody, result.ignored, "暂无未命中窗口或阶段外未到期记录");
      elements.exportButton.disabled = false;
      setStatus(
        `完成：已检查 ${result.stats.checked} 人，预排 ${result.stats.schedule} 人，其中已过期 ${result.stats.expired} 人，30天内 ${result.stats.priority30} 人，60天内 ${result.stats.priority60} 人，90天内 ${result.stats.priority90} 人。`
      );
    } catch (error) {
      state.result = null;
      resetView();
      setStatus(error.message || "预排名单处理失败。", true);
    } finally {
      elements.runButton.disabled = false;
    }
  }

  elements.stageStartInput.value = todayString();
  elements.stageEndInput.value = monthEndString();
  elements.projectSelect.addEventListener("change", renderRuleSummary);
  elements.ruleFile.addEventListener("change", loadRuleFile);
  elements.runButton.addEventListener("click", runSchedule);
  elements.exportButton.addEventListener("click", exportResult);
  resetView();
  renderProjectOptions();
})();
