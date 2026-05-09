(function () {
  const Utils = window.SuperTraining.Utils;
  const ResultStatus = window.SuperTraining.ResultStatus;
  const runtime = window.SuperTrainingApp;
  const elements = runtime.elements;

  const STATUS_KEYS = [
    { field: "expired", label: "已过期" },
    { field: "expiredScheduled", label: "已过期已排补训" },
    { field: "must", label: "必须排" },
    { field: "uncoveredScheduled", label: "已排未覆盖" },
    { field: "recommended", label: "推荐排" },
    { field: "abnormal", label: "异常" }
  ];

  let currentSummaryRows = [];
  let selectedProject = "";
  let selectedStatus = "";

  function badge(status) {
    return `<span class="badge ${Utils.escapeHtml(ResultStatus.badgeToneForWorkbenchStatus(status))}">${Utils.escapeHtml(status)}</span>`;
  }

  function getRowsBySelection(projectName, status) {
    const project = currentSummaryRows.find((row) => row.projectName === projectName);
    if (!project || !project.rowsByStatus) return [];
    return project.rowsByStatus[status] || [];
  }

  function findDefaultSelection(rows) {
    for (const row of rows || []) {
      for (const statusItem of STATUS_KEYS) {
        if (row[statusItem.field] > 0) {
          return {
            projectName: row.projectName,
            status: statusItem.label
          };
        }
      }
    }
    return { projectName: "", status: "" };
  }

  function renderSelectedPeople(projectName, status) {
    const rows = getRowsBySelection(projectName, status);
    runtime.state.workbenchSelection = projectName && status
      ? { projectName, status, rows }
      : null;
    if (runtime.controls) runtime.controls.refreshButtons();

    if (!projectName || !status) {
      elements.workbenchSelectedPeopleTitle.textContent = "人员明细";
      elements.workbenchSelectedPeopleIntro.textContent = "点击左侧矩阵中的数字后显示具体人员。";
      elements.workbenchSelectedPeople.innerHTML = `<div class="empty-block">请选择一个项目和状态。</div>`;
      return;
    }

    elements.workbenchSelectedPeopleTitle.textContent = `${projectName} - ${status}`;
    elements.workbenchSelectedPeopleIntro.textContent = `共 ${rows.length} 人，随上方筛选条件实时变化。`;

    if (!rows.length) {
      elements.workbenchSelectedPeople.innerHTML = `<div class="empty-block">当前没有对应人员。</div>`;
      return;
    }

    elements.workbenchSelectedPeople.innerHTML = `
      <div class="table-shell selected-person-shell">
        <table class="table table-hover align-middle result-table selected-person-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>员工号</th>
              <th>有效期截止日期</th>
              <th>已排日期</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td class="person-name">${Utils.escapeHtml(row.name || "-")}</td>
                <td>${Utils.escapeHtml(row.employeeId || "-")}</td>
                <td>${Utils.escapeHtml(row.dueDate || row.expiry || "-")}</td>
                <td>${Utils.escapeHtml(row.scheduledDate || "-")}</td>
                <td>${Utils.escapeHtml(row.reason || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderCountButton(row, statusItem) {
    const count = row[statusItem.field] || 0;
    const selected = selectedProject === row.projectName && selectedStatus === statusItem.label;
    return `
      <button
        class="risk-count-button${selected ? " is-selected" : ""}"
        type="button"
        data-project="${Utils.escapeHtml(row.projectName)}"
        data-status="${Utils.escapeHtml(statusItem.label)}"
        ${count ? "" : "disabled"}
      >${Utils.escapeHtml(count)}</button>
    `;
  }

  function renderProjectSummary(rows) {
    currentSummaryRows = rows || [];
    if (!currentSummaryRows.length) {
      selectedProject = "";
      selectedStatus = "";
      elements.workbenchProjectSummaryBody.innerHTML = `<tr><td class="empty-block" colspan="6">当前没有项目风险统计。</td></tr>`;
      renderSelectedPeople("", "");
      return;
    }

    const currentRows = getRowsBySelection(selectedProject, selectedStatus);
    if (!currentRows.length) {
      const defaultSelection = findDefaultSelection(currentSummaryRows);
      selectedProject = defaultSelection.projectName;
      selectedStatus = defaultSelection.status;
    }

    elements.workbenchProjectSummaryBody.innerHTML = currentSummaryRows.map((row) => `
      <tr>
        <td>${Utils.escapeHtml(row.projectName)}</td>
        ${STATUS_KEYS.map((statusItem) => `<td>${renderCountButton(row, statusItem)}</td>`).join("")}
        <td>${Utils.escapeHtml(row.total)}</td>
      </tr>
    `).join("");

    renderSelectedPeople(selectedProject, selectedStatus);
  }

  function renderWorkbenchSummary(summaryData) {
    const data = summaryData || {};
    renderProjectSummary(data.projectSummaryRows || []);
  }

  elements.workbenchProjectSummaryBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const projectName = target.dataset.project || "";
    const status = target.dataset.status || "";
    if (!projectName || !status) return;
    selectedProject = projectName;
    selectedStatus = status;
    renderProjectSummary(currentSummaryRows);
  });

  runtime.summaryView = {
    renderWorkbenchSummary
  };
})();
