(function () {
  const tools = window.TrainingTools;
  const DATE_HEADERS = new Set(["培训开始日期", "培训结束日期"]);
  const HEADER_STYLE = {
    font: { bold: true, color: { rgb: "1F2328" } },
    fill: { patternType: "solid", fgColor: { rgb: "F6F8FA" } },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "D0D7DE" } },
      bottom: { style: "thin", color: { rgb: "D0D7DE" } },
      left: { style: "thin", color: { rgb: "D0D7DE" } },
      right: { style: "thin", color: { rgb: "D0D7DE" } }
    }
  };
  const CONFLICT_STYLE = {
    alignment: { vertical: "center", horizontal: "center" },
    fill: { patternType: "solid", fgColor: { rgb: "FFE5E5" } },
    border: {
      top: { style: "thin", color: { rgb: "E57373" } },
      bottom: { style: "thin", color: { rgb: "E57373" } },
      left: { style: "thin", color: { rgb: "E57373" } },
      right: { style: "thin", color: { rgb: "E57373" } }
    }
  };

  const runtime = window.TrainingToolsSuiteConflict;
  const state = runtime.state;
  const elements = runtime.elements;

  function setStatus(message, isError = false) {
    elements.statusLine.textContent = message;
    elements.statusLine.classList.toggle("is-error", Boolean(isError));
  }

  function renderStats(stats) {
    const values = [stats.total, stats.conflict, stats.normal, stats.skipped];
    Array.from(elements.statsGrid.children).forEach((card, index) => {
      const node = card.querySelector("strong");
      if (node) node.textContent = String(values[index] || 0);
    });
  }

  function renderConflictRows(rows) {
    if (!rows.length) {
      elements.conflictBody.innerHTML = '<tr><td colspan="7" class="empty-block">暂无冲突记录</td></tr>';
      return;
    }

    elements.conflictBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${tools.escapeHtml(row.rowNumber)}</td>
        <td>${tools.escapeHtml(row.name)}</td>
        <td>${tools.escapeHtml(row.projectName)}</td>
        <td>${tools.escapeHtml(row.startDateText)}</td>
        <td>${tools.escapeHtml(row.endDateText)}</td>
        <td>${tools.escapeHtml(row.conflictRowsText)}</td>
        <td>${tools.escapeHtml(row.reason)}</td>
      </tr>
    `).join("");
  }

  function renderSkippedRows(rows) {
    if (!rows.length) {
      elements.skippedBody.innerHTML = '<tr><td colspan="5" class="empty-block">暂无跳过记录</td></tr>';
      return;
    }

    elements.skippedBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${tools.escapeHtml(row.rowNumber)}</td>
        <td>${tools.escapeHtml(row.name)}</td>
        <td>${tools.escapeHtml(row.projectName)}</td>
        <td><span class="badge warn">${tools.escapeHtml(row.status)}</span></td>
        <td>${tools.escapeHtml(row.reason)}</td>
      </tr>
    `).join("");
  }

  function isNonEmptyRow(row) {
    return row.some((value) => value !== undefined && value !== null && tools.normalizeText(value) !== "");
  }

  function buildSourceRows(matrix) {
    return matrix.slice(1).reduce((rows, row, index) => {
      if (!isNonEmptyRow(row)) return rows;
      rows.push({
        rowNumber: index + 2,
        values: [...row]
      });
      return rows;
    }, []);
  }

  function buildColumnIndex(headers) {
    return {
      name: headers.findIndex((item) => item === "姓名"),
      projectName: headers.findIndex((item) => item === "项目名称"),
      startDate: headers.findIndex((item) => item === "培训开始日期"),
      endDate: headers.findIndex((item) => item === "培训结束日期")
    };
  }

  function addConflict(conflictMap, leftRowNumber, rightRowNumber) {
    const leftSet = conflictMap.get(leftRowNumber) || new Set();
    leftSet.add(rightRowNumber);
    conflictMap.set(leftRowNumber, leftSet);

    const rightSet = conflictMap.get(rightRowNumber) || new Set();
    rightSet.add(leftRowNumber);
    conflictMap.set(rightRowNumber, rightSet);
  }

  function hasOverlap(left, right) {
    return left.startDate <= right.endDate && right.startDate <= left.endDate;
  }

  function formatCellValue(value, header) {
    if (DATE_HEADERS.has(header)) {
      const dateValue = tools.parseDate(value);
      return dateValue ? tools.formatDate(dateValue) : tools.normalizeText(value);
    }
    return value ?? "";
  }

  function computeSheetWidths(rows) {
    const widths = [];
    rows.forEach((row) => {
      row.forEach((value, index) => {
        const text = String(value ?? "");
        widths[index] = Math.min(38, Math.max(widths[index] || 10, text.length + 2));
      });
    });
    return widths.map((wch) => ({ wch }));
  }

  function buildPlainSheet(rows, options = {}) {
    const sheet = tools.buildSheet(rows, options);
    sheet["!cols"] = computeSheetWidths(rows);
    return sheet;
  }

  function applyHeaderStyle(sheet) {
    const range = window.XLSX.utils.decode_range(sheet["!ref"] || "A1");
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = window.XLSX.utils.encode_cell({ r: 0, c: column });
      if (!sheet[address]) continue;
      sheet[address].s = HEADER_STYLE;
    }
  }

  function buildResultSheet(headers, exportRows) {
    const resultRows = [
      [...headers, "核对结果", "冲突行号", "说明"],
      ...exportRows.map((row) => [
        ...headers.map((header, index) => formatCellValue(row.originalValues[index], header)),
        row.status,
        row.conflictRowsText,
        row.reason
      ])
    ];
    const sheet = buildPlainSheet(resultRows, { dateHeaders: DATE_HEADERS });
    applyHeaderStyle(sheet);

    exportRows.forEach((row, index) => {
      if (row.status !== "冲突") return;
      const sheetRowIndex = index + 1;
      for (let column = 0; column < resultRows[0].length; column += 1) {
        const address = window.XLSX.utils.encode_cell({ r: sheetRowIndex, c: column });
        if (!sheet[address]) continue;
        sheet[address].s = CONFLICT_STYLE;
      }
    });

    return sheet;
  }

  function processWorkbook(workbook) {
    const info = tools.readConflictWorkbook(workbook);
    const columnIndex = buildColumnIndex(info.headers);
    const sourceRows = buildSourceRows(info.matrix);
    const validRows = [];
    const skippedRows = [];

    sourceRows.forEach((entry) => {
      const name = tools.normalizeText(entry.values[columnIndex.name]);
      const projectName = tools.normalizeText(entry.values[columnIndex.projectName]);
      const startDate = tools.parseDate(entry.values[columnIndex.startDate]);
      const endDate = tools.parseDate(entry.values[columnIndex.endDate]);
      const issues = [];

      if (!name) issues.push("姓名为空");
      if (!projectName) issues.push("项目名称为空");
      if (!startDate) issues.push("培训开始日期无法解析");
      if (!endDate) issues.push("培训结束日期无法解析");
      if (startDate && endDate && endDate < startDate) issues.push("培训结束日期早于培训开始日期");

      if (issues.length) {
        skippedRows.push({
          rowNumber: entry.rowNumber,
          name,
          projectName,
          status: "跳过",
          reason: issues.join("；"),
          conflictRowsText: "",
          originalValues: entry.values
        });
        return;
      }

      validRows.push({
        rowNumber: entry.rowNumber,
        name,
        projectName,
        startDate,
        endDate,
        startDateText: tools.formatDate(startDate),
        endDateText: tools.formatDate(endDate),
        originalValues: entry.values
      });
    });

    const groupedRows = new Map();
    validRows.forEach((row) => {
      const list = groupedRows.get(row.name) || [];
      list.push(row);
      groupedRows.set(row.name, list);
    });

    const conflictMap = new Map();
    groupedRows.forEach((rows) => {
      rows.sort((left, right) => {
        const leftStartTime = left.startDate.getTime();
        const rightStartTime = right.startDate.getTime();
        const leftEndTime = left.endDate.getTime();
        const rightEndTime = right.endDate.getTime();
        return leftStartTime - rightStartTime || leftEndTime - rightEndTime || left.rowNumber - right.rowNumber;
      });
      for (let leftIndex = 0; leftIndex < rows.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < rows.length; rightIndex += 1) {
          if (rows[rightIndex].startDate > rows[leftIndex].endDate) break;
          if (hasOverlap(rows[leftIndex], rows[rightIndex])) {
            addConflict(conflictMap, rows[leftIndex].rowNumber, rows[rightIndex].rowNumber);
          }
        }
      }
    });

    const processedRows = validRows.map((row) => {
      const conflictRows = Array.from<number>(conflictMap.get(row.rowNumber) || []).sort((left, right) => left - right);
      const conflictRowsText = conflictRows.join("、");
      const status = conflictRows.length ? "冲突" : "正常";
      const reason = conflictRows.length
        ? `与第 ${conflictRowsText} 行日期重叠。`
        : "同名人员培训日期未发现重叠。";

      return {
        ...row,
        status,
        reason,
        conflictRowsText
      };
    });

    const processedMap = new Map(processedRows.map((row) => [row.rowNumber, row]));
    const skippedMap = new Map(skippedRows.map((row) => [row.rowNumber, row]));
    const exportRows = sourceRows.map((entry) => processedMap.get(entry.rowNumber) || skippedMap.get(entry.rowNumber));
    const conflictRows = processedRows
      .filter((row) => row.status === "冲突")
      .sort((left, right) => left.rowNumber - right.rowNumber);

    return {
      sheetName: info.name,
      headers: info.headers,
      exportRows,
      conflictRows,
      skippedRows: skippedRows.sort((left, right) => left.rowNumber - right.rowNumber),
      stats: {
        total: sourceRows.length,
        conflict: conflictRows.length,
        normal: processedRows.length - conflictRows.length,
        skipped: skippedRows.length
      }
    };
  }

  function exportWorkbook() {
    if (!state.result) return;

    const workbook = window.XLSX.utils.book_new();
    const summaryRows = [
      ["项目", "内容"],
      ["来源文件", state.sourceFileName],
      ["来源工作表", state.result.sheetName],
      ["记录总数", state.result.stats.total],
      ["冲突记录", state.result.stats.conflict],
      ["正常记录", state.result.stats.normal],
      ["跳过记录", state.result.stats.skipped]
    ];
    const conflictRows = [
      ["培训表行号", "姓名", "项目名称", "培训开始日期", "培训结束日期", "冲突行号", "说明"],
      ...state.result.conflictRows.map((row) => [row.rowNumber, row.name, row.projectName, row.startDateText, row.endDateText, row.conflictRowsText, row.reason])
    ];
    const skippedRows = [
      ["培训表行号", "姓名", "项目名称", "状态", "原因"],
      ...state.result.skippedRows.map((row) => [row.rowNumber, row.name, row.projectName, row.status, row.reason])
    ];

    window.XLSX.utils.book_append_sheet(workbook, buildPlainSheet(summaryRows), "摘要");
    window.XLSX.utils.book_append_sheet(workbook, buildResultSheet(state.result.headers, state.result.exportRows), "核对结果");
    window.XLSX.utils.book_append_sheet(workbook, buildPlainSheet(conflictRows, { dateHeaders: DATE_HEADERS }), "冲突记录");
    window.XLSX.utils.book_append_sheet(workbook, buildPlainSheet(skippedRows), "跳过记录");
    window.XLSX.writeFile(workbook, "培训冲突核对_结果.xlsx");
  }

  async function runCheck() {
    const file = elements.sourceFile.files[0];
    if (!file) {
      setStatus("请先选择培训表文件。", true);
      return;
    }

    elements.runButton.disabled = true;
    elements.exportButton.disabled = true;
    setStatus("正在识别工作表并核对培训日期冲突...");

    try {
      const workbook = await tools.readWorkbookFile(file);
      const result = processWorkbook(workbook);
      state.result = result;
      state.sourceFileName = file.name;

      renderStats(result.stats);
      renderConflictRows(result.conflictRows);
      renderSkippedRows(result.skippedRows);
      elements.exportButton.disabled = false;
      setStatus(`完成：工作表“${result.sheetName}”共识别 ${result.stats.total} 条记录，冲突 ${result.stats.conflict} 条，正常 ${result.stats.normal} 条，跳过 ${result.stats.skipped} 条。`);
    } catch (error) {
      state.result = null;
      state.sourceFileName = "";
      renderStats({ total: 0, conflict: 0, normal: 0, skipped: 0 });
      renderConflictRows([]);
      renderSkippedRows([]);
      setStatus(error.message || "培训冲突核对失败。", true);
    } finally {
      elements.runButton.disabled = false;
    }
  }

  renderStats({ total: 0, conflict: 0, normal: 0, skipped: 0 });
  renderConflictRows([]);
  renderSkippedRows([]);
  elements.runButton.addEventListener("click", runCheck);
  elements.exportButton.addEventListener("click", exportWorkbook);
})();
