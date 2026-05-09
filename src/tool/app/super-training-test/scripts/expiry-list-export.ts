(function () {
  const Utils = window.SuperTraining.Utils;

  function buildRows(result) {
    return [
      result.detailColumns,
      ...result.detailRows.map((row) => [
        row.projectName,
        row.employeeId,
        row.name,
        row.expiry,
        row.dueMonth,
        row.source
      ])
    ];
  }

  function buildWorkbook(result) {
    const workbook = window.XLSX.utils.book_new();
    const rows = buildRows(result);
    const sheet = window.XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = Utils.computeSheetWidths(rows);
    Utils.centerAlignSheet(sheet);
    window.XLSX.utils.book_append_sheet(workbook, sheet, "到期清单");
    return workbook;
  }

  window.SuperTraining.ExpiryListExport = {
    buildWorkbook
  };
})();
