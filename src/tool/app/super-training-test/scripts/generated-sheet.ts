(function () {
  const Config = window.SuperTraining.Config;
  const Utils = window.SuperTraining.Utils;

  const HEADER_STYLE = {
    font: { bold: true, color: { rgb: "4B2F1A" } },
    fill: { patternType: "solid", fgColor: { rgb: "F1DEBD" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "C8A87C" } },
      bottom: { style: "thin", color: { rgb: "C8A87C" } },
      left: { style: "thin", color: { rgb: "C8A87C" } },
      right: { style: "thin", color: { rgb: "C8A87C" } }
    }
  };

  const BODY_STYLE = {
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E4D6C1" } },
      bottom: { style: "thin", color: { rgb: "E4D6C1" } },
      left: { style: "thin", color: { rgb: "E4D6C1" } },
      right: { style: "thin", color: { rgb: "E4D6C1" } }
    }
  };

  const NOTE_TITLE_STYLE = {
    font: { bold: true, color: { rgb: "7D2F0D" } },
    fill: { patternType: "solid", fgColor: { rgb: "F3E1C1" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "C8A87C" } },
      bottom: { style: "thin", color: { rgb: "C8A87C" } },
      left: { style: "thin", color: { rgb: "C8A87C" } },
      right: { style: "thin", color: { rgb: "C8A87C" } }
    }
  };

  const NOTE_STYLE = {
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E4D6C1" } },
      bottom: { style: "thin", color: { rgb: "E4D6C1" } },
      left: { style: "thin", color: { rgb: "E4D6C1" } },
      right: { style: "thin", color: { rgb: "E4D6C1" } }
    }
  };

  function removeSheetIfExists(workbook, sheetName) {
    if (!workbook.Sheets[sheetName]) return;
    delete workbook.Sheets[sheetName];
    workbook.SheetNames = workbook.SheetNames.filter((name) => name !== sheetName);
  }

  function coerceEmployeeIdValue(value) {
    const text = Utils.normalizeText(value);
    return /^\d+$/.test(text) ? Number(text) : text;
  }

  function buildRowValue(header, record) {
    const defaults = record.pendingDefaults || {};
    const normalizedHeader = Utils.normalizeText(header);

    if (normalizedHeader === "序号") return "";
    if (normalizedHeader === "员工号") return coerceEmployeeIdValue(record.employeeId);
    if (normalizedHeader === "姓名") return record.name;
    if (normalizedHeader === "项目名称") return record.projectName;
    if (normalizedHeader === "培训开始日期") return record.trainingStart || "";
    if (normalizedHeader === "培训结束日期") return record.trainingEnd || "";
    if (normalizedHeader === "培训信息是否录入") return "否";
    if (normalizedHeader === "备注") return record.remark || Utils.normalizeText(defaults["备注"]);
    if (normalizedHeader === "有效期") return record.oldExpiry || "";
    if (Object.prototype.hasOwnProperty.call(defaults, header)) return defaults[header];
    return "";
  }

  function copyProjectStyles(sheet, project, rowCount) {
    const sourceInfo = project.sheetInfo || project.pendingInfo;
    if (!sourceInfo) return false;

    const sourceSheet = sourceInfo.sheet;
    if (sourceSheet["!cols"]) {
      sheet["!cols"] = Utils.deepClone(sourceSheet["!cols"]);
    }

    if (sourceSheet["!autofilter"]) {
      const width = Math.max(sourceInfo.headers.length - 1, 0);
      sheet["!autofilter"] = {
        ref: window.XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: Math.max(rowCount - 1, 0), c: width }
        })
      };
    }

    const sampleRowNumber = (project.pendingInfo && project.pendingInfo.sampleRowNumber)
      || sourceInfo.sampleRowNumber
      || (sourceInfo.rows.length ? sourceInfo.rows[0].rowNumber : 2);
    const sampleRowIndex = Math.max(sampleRowNumber - 1, 1);

    for (let columnIndex = 0; columnIndex < sourceInfo.headers.length; columnIndex += 1) {
      const sourceHeaderAddress = window.XLSX.utils.encode_cell({ r: 0, c: columnIndex });
      const targetHeaderAddress = window.XLSX.utils.encode_cell({ r: 0, c: columnIndex });
      if (sourceSheet[sourceHeaderAddress] && sheet[targetHeaderAddress]) {
        sheet[targetHeaderAddress].s = Utils.cloneStyle(sourceSheet[sourceHeaderAddress].s);
      }

      const sourceBodyAddress = window.XLSX.utils.encode_cell({ r: sampleRowIndex, c: columnIndex });
      for (let rowIndex = 1; rowIndex < rowCount; rowIndex += 1) {
        const targetBodyAddress = window.XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        if (!sheet[targetBodyAddress] || !sourceSheet[sourceBodyAddress]) continue;
        sheet[targetBodyAddress].s = Utils.cloneStyle(sourceSheet[sourceBodyAddress].s);
      }
    }

    return true;
  }

  function applyFallbackStyles(sheet, headers, rowCount) {
    for (let columnIndex = 0; columnIndex < headers.length; columnIndex += 1) {
      const headerAddress = window.XLSX.utils.encode_cell({ r: 0, c: columnIndex });
      if (sheet[headerAddress]) {
        sheet[headerAddress].s = Utils.cloneStyle(HEADER_STYLE);
      }

      for (let rowIndex = 1; rowIndex < rowCount; rowIndex += 1) {
        const address = window.XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        if (!sheet[address]) continue;
        sheet[address].s = Utils.cloneStyle(BODY_STYLE);
      }
    }
  }

  function applyDateFormats(sheet, headers, rowCount) {
    const dateHeaders = new Set(["培训开始日期", "培训结束日期", "有效期"]);
    headers.forEach((header, columnIndex) => {
      if (!dateHeaders.has(Utils.normalizeText(header))) return;
      for (let rowIndex = 1; rowIndex < rowCount; rowIndex += 1) {
        const address = window.XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        const cell = sheet[address];
        if (!cell || cell.t !== "d") continue;
        cell.z = Config.LONG_DATE_FORMAT;
        cell.s = Utils.mergeStyle(cell.s, { numFmt: Config.LONG_DATE_FORMAT });
      }
    });
  }

  function writeNoteArea(sheet, headers, projectSheet, selectedMonths) {
    const startColumn = headers.length + 2;
    Utils.writeCell(sheet, 1, startColumn, "生成说明", NOTE_TITLE_STYLE);
    Utils.writeCell(sheet, 2, startColumn, "项目", NOTE_STYLE);
    Utils.writeCell(sheet, 2, startColumn + 1, projectSheet.project.canonical, NOTE_STYLE);
    Utils.writeCell(sheet, 3, startColumn, "所选月份", NOTE_STYLE);
    Utils.writeCell(sheet, 3, startColumn + 1, selectedMonths.join("、"), NOTE_STYLE);
    Utils.writeCell(sheet, 4, startColumn, "生成记录", NOTE_STYLE);
    Utils.writeCell(sheet, 4, startColumn + 1, projectSheet.records.length, NOTE_STYLE, "n");
    Utils.writeCell(sheet, 5, startColumn, "来源项目 sheet", NOTE_STYLE);
    Utils.writeCell(
      sheet,
      5,
      startColumn + 1,
      projectSheet.project.sheetName || "无，使用通用表头",
      NOTE_STYLE
    );
    Utils.writeCell(sheet, 6, startColumn, "备注", NOTE_STYLE);
    Utils.writeCell(
      sheet,
      6,
      startColumn + 1,
      "如果开始日期或结束日期为空，说明该月份在模板中没有现成日期，需人工补充。",
      NOTE_STYLE
    );
  }

  function buildSheetName(projectName) {
    return Utils.sanitizeSheetName(`${projectName}${Config.GENERATED_SHEET_SUFFIX}`).slice(0, 31);
  }

  function buildWorksheet(projectSheet, selectedMonths) {
    const rows = [
      projectSheet.headers,
      ...projectSheet.records.map((record) => projectSheet.headers.map((header) => buildRowValue(header, record)))
    ];

    const sheet = window.XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
    const rowCount = rows.length;
    const hasSourceStyles = copyProjectStyles(sheet, projectSheet.project, rowCount);

    if (!sheet["!cols"] || !sheet["!cols"].length) {
      sheet["!cols"] = Utils.computeSheetWidths(rows);
    }

    if (!hasSourceStyles) {
      applyFallbackStyles(sheet, projectSheet.headers, rowCount);
    }

    projectSheet.headers.forEach((header, columnIndex) => {
      if (Utils.normalizeText(header) !== "序号") return;
      for (let rowIndex = 1; rowIndex < rowCount; rowIndex += 1) {
        const address = window.XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        sheet[address] = {
          t: "n",
          f: "ROW()-1",
          s: Utils.cloneStyle(sheet[address] ? sheet[address].s : BODY_STYLE)
        };
      }
    });

    applyDateFormats(sheet, projectSheet.headers, rowCount);
    writeNoteArea(sheet, projectSheet.headers, projectSheet, selectedMonths);
    Utils.centerAlignSheet(sheet);
    return sheet;
  }

  function attachGeneratedSheets(workbook, schedulePlan, selectedMonths) {
    const createdSheetNames = [];

    schedulePlan.projectSheets.forEach((projectSheet) => {
      const sheetName = buildSheetName(projectSheet.project.canonical);
      removeSheetIfExists(workbook, sheetName);
      const sheet = buildWorksheet(projectSheet, selectedMonths);
      workbook.Sheets[sheetName] = sheet;
      workbook.SheetNames.push(sheetName);
      createdSheetNames.push(sheetName);
    });

    return createdSheetNames;
  }

  window.SuperTraining.GeneratedSheet = {
    attachGeneratedSheets
  };
})();
