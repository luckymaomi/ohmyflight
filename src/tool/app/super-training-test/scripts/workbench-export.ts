(function () {
  const Utils = window.SuperTraining.Utils;

  function buildRows(result) {
    return [
      result.detailColumns,
      ...result.detailRows.map((row) => [
        row.status,
        row.projectName,
        row.employeeId,
        row.name,
        row.expiry,
        row.dueMonth,
        row.dueDate,
        row.scheduledDate,
        row.source,
        row.reason
      ])
    ];
  }

  function buildSelectionRows(selection) {
    const rows = selection && selection.rows ? selection.rows : [];
    return [
      ["项目", "状态", "姓名", "员工号", "有效期截止日期", "最晚完成日期", "已排日期", "说明", "来源"],
      ...rows.map((row) => [
        row.projectName,
        row.status,
        row.name,
        row.employeeId,
        row.expiry,
        row.dueDate,
        row.scheduledDate,
        row.reason,
        row.source
      ])
    ];
  }

  function appendSheet(workbook, sheetName, rows) {
    const sheet = window.XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = Utils.computeSheetWidths(rows);
    Utils.centerAlignSheet(sheet);
    window.XLSX.utils.book_append_sheet(workbook, sheet, Utils.sanitizeSheetName(sheetName).slice(0, 31));
  }

  function buildWorkbook(result) {
    const workbook = window.XLSX.utils.book_new();
    appendSheet(workbook, "当前筛选总览", buildRows(result));
    return workbook;
  }

  function buildSelectionWorkbook(selection) {
    const workbook = window.XLSX.utils.book_new();
    appendSheet(workbook, "当前人员明细", buildSelectionRows(selection));
    return workbook;
  }

  window.SuperTraining.WorkbenchExport = {
    buildWorkbook,
    buildSelectionWorkbook
  };
})();
