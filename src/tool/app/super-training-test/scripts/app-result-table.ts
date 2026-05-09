(function () {
  const Utils = window.SuperTraining.Utils;
  const ResultStatus = window.SuperTraining.ResultStatus;
  const runtime = window.SuperTrainingApp;
  const elements = runtime.elements;

  function getTableVariant(columns) {
    const signature = columns.join("|");
    if (signature === "项目|员工号|姓名|原有效期|状态|开始日期|结束日期|说明") {
      return "result-table-schedule";
    }
    if (signature === "项目|员工号|姓名|有效期|状态|处理结果|说明") {
      return "result-table-plan-check";
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
    if (signature === "状态|项目|姓名|当前有效期|已排日期|说明") {
      return "result-table-workbench";
    }
    if (signature === "状态|项目|员工号|姓名|当前有效期|到期月份|最晚完成日期|已排日期|是否录入|来源|说明") {
      return "result-table-workbench";
    }
    if (signature === "项目|员工号|姓名|原有效期|轻重缓急|状态|开始日期|结束日期|说明") {
      return "result-table-schedule";
    }
    if (signature === "项目|员工号|姓名|有效期|状态|处理结果|说明") {
      return "result-table-plan-check";
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
      tableElement.classList.remove(
        "result-table-schedule",
        "result-table-validity",
        "result-table-plan-check",
        "result-table-workbench",
        "result-table-skipped"
      );
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

  function toPlanCheckDetailRows(rows) {
    return rows.map((row) => [
      row.projectName,
      row.employeeId,
      row.name,
      row.expiry,
      ResultStatus.makeBadgeCell(row.status, ResultStatus.badgeToneForPlanCheckStatus(row.status)),
      ResultStatus.makeBadgeCell(row.result, ResultStatus.badgeToneForPlanCheckResult(row.result)),
      row.reason
    ]);
  }

  function toPlanCheckSkippedRows(rows) {
    return rows.map((row) => [
      row.projectName,
      row.name,
      ResultStatus.makeBadgeCell(row.status, ResultStatus.badgeToneForSkippedStatus(row.status)),
      row.reason
    ]);
  }

  function toExpiryListDetailRows(rows) {
    return rows.map((row) => [
      row.projectName,
      row.employeeId,
      row.name,
      row.expiry,
      row.dueMonth,
      row.source
    ]);
  }

  function toExpiryListSkippedRows(rows) {
    return rows.map((row) => [
      row.projectName,
      row.employeeId,
      row.name,
      ResultStatus.makeBadgeCell(row.status, ResultStatus.badgeToneForSkippedStatus(row.status)),
      row.source,
      row.reason
    ]);
  }

  function toWorkbenchDetailRows(rows) {
    return rows.map((row) => [
      ResultStatus.makeBadgeCell(row.status, ResultStatus.badgeToneForWorkbenchStatus(row.status)),
      row.projectName,
      row.name,
      row.expiry,
      row.scheduledDate,
      row.reason
    ]);
  }

  runtime.resultTable = {
    renderTable,
    renderSkippedSummary,
    toValidityDetailRows,
    toValiditySkippedRows,
    toScheduleDetailRowsWithPriority,
    toScheduleSkippedRows,
    toPlanCheckDetailRows,
    toPlanCheckSkippedRows,
    toExpiryListDetailRows,
    toExpiryListSkippedRows,
    toWorkbenchDetailRows
  };
})();
