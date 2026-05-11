(function () {
  const Utils = window.SuperTraining.Utils;

  const MISSING_COLUMNS = ["姓名", "员工号", "分部", "技术信息"];

  function toMissingExportRows(missingPeople) {
    return (missingPeople || []).map((person) => [
      person.name || "",
      person.employeeId || "",
      person.department || "",
      person.techInfo || ""
    ]);
  }

  function buildMissingWorkbook(result) {
    const workbook = window.XLSX.utils.book_new();
    const rows = [
      [`CRM年度未参加人员：${result.year}`],
      [`导出时间：${new Date().toLocaleString()}`],
      [],
      MISSING_COLUMNS,
      ...toMissingExportRows(result.missingPeople)
    ];
    const sheet = window.XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 26 }
    ];
    Utils.centerAlignSheet(sheet);
    window.XLSX.utils.book_append_sheet(workbook, sheet, "CRM未参加人员");
    return workbook;
  }

  window.SuperTraining.CrmExport = {
    MISSING_COLUMNS,
    toMissingExportRows,
    buildMissingWorkbook
  };
})();
