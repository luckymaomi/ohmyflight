(function () {
  const tools = window.TrainingTools;
  type ValidityUpdateOptions = {
    today?: Date | null;
  };

  const UPDATED_CELL_STYLE = {
    font: { color: { rgb: "FFFFFF" }, bold: true },
    fill: { patternType: "solid", fgColor: { rgb: "CF222E" } }
  };

  function buildIndex(rows, columnIndex) {
    const map = new Map();
    if (columnIndex < 0) return map;

    rows.forEach((row, index) => {
      const key = tools.normalizeText(row[columnIndex]);
      if (!key) return;
      const list = map.get(key) || [];
      list.push(index);
      map.set(key, list);
    });

    return map;
  }

  function buildProjectColumnMap(headers) {
    const map = new Map();
    headers.forEach((header, index) => {
      const normalized = tools.normalizeProjectName(header);
      if (!normalized || map.has(normalized)) return;
      map.set(normalized, index);
    });
    return map;
  }

  function resolvePeopleRow(record, context) {
    const employeeId = tools.normalizeText(record["员工号"]);
    const name = tools.normalizeText(record["姓名"]);
    const nameMatches = name ? (context.byName.get(name) || []) : [];

    if (nameMatches.length === 1) {
      const rowIndex = nameMatches[0];
      const targetRow = context.rows[rowIndex];
      const targetEmployeeId = tools.normalizeText(targetRow[context.employeeCol]);
      if (employeeId && targetEmployeeId && targetEmployeeId !== employeeId) {
        return {
          error: `姓名命中，但员工号不一致（有效期表：${targetEmployeeId}）。`
        };
      }
      return {
        rowIndex,
        matchedBy: "姓名"
      };
    }

    if (nameMatches.length > 1) {
      if (!employeeId) {
        return { error: "有效期表中存在重名，且培训表缺少员工号，无法唯一定位。" };
      }

      const narrowed = nameMatches.filter((rowIndex) => {
        const targetRow = context.rows[rowIndex];
        return tools.normalizeText(targetRow[context.employeeCol]) === employeeId;
      });

      if (narrowed.length === 1) {
        return {
          rowIndex: narrowed[0],
          matchedBy: "姓名 + 员工号"
        };
      }
      return { error: "有效期表中存在重名，员工号也无法唯一确认。" };
    }

    const idMatches = employeeId ? (context.byId.get(employeeId) || []) : [];
    if (idMatches.length === 1) {
      return {
        rowIndex: idMatches[0],
        matchedBy: "员工号二次验证"
      };
    }
    if (idMatches.length > 1) {
      return { error: "员工号命中多行，无法唯一定位。" };
    }

    return { error: "未在有效期表中找到对应人员。" };
  }

  function buildSkippedRow(row, projectName, status, reason) {
    return {
      rowNumber: row.__rowNumber,
      name: tools.normalizeText(row["姓名"]),
      projectName,
      status,
      reason
    };
  }

  function sortTrainingRows(rows) {
    return [...rows].sort((left, right) => {
      const leftDate = tools.parseDate(left["培训开始日期"]) || tools.parseDate(left["培训结束日期"]);
      const rightDate = tools.parseDate(right["培训开始日期"]) || tools.parseDate(right["培训结束日期"]);
      const leftTime = leftDate ? leftDate.getTime() : 0;
      const rightTime = rightDate ? rightDate.getTime() : 0;
      return leftTime - rightTime || left.__rowNumber - right.__rowNumber;
    });
  }

  function registerUpdatedCell(updatedCellMap, rowIndex, columnIndex) {
    const columns = updatedCellMap.get(rowIndex) || new Set();
    columns.add(columnIndex);
    updatedCellMap.set(rowIndex, columns);
  }

  function buildValidityUpdate(trainingWorkbook, validityWorkbook, options = {} as ValidityUpdateOptions) {
    const trainingInfo = tools.readTrainingWorkbook(trainingWorkbook);
    const validityInfo = tools.readValidityWorkbook(validityWorkbook);
    const ruleMap = trainingInfo.ruleInfo.ruleMap;
    const today = options.today || tools.createTodayDate();

    const employeeCol = validityInfo.headers.findIndex((item) => item === "员工号");
    const nameCol = validityInfo.headers.findIndex((item) => item === "姓名");
    const context = {
      rows: validityInfo.rows.map((row) => [...row]),
      headers: validityInfo.headers,
      employeeCol,
      nameCol,
      byId: buildIndex(validityInfo.rows, employeeCol),
      byName: buildIndex(validityInfo.rows, nameCol),
      projectColumns: buildProjectColumnMap(validityInfo.headers)
    };

    const previewRows = [];
    const skippedRows = [];
    const updatedCellMap = new Map();
    const stats = {
      recordsTotal: trainingInfo.trainingInfo.rows.length,
      matched: 0,
      updated: 0,
      unchanged: 0,
      rollback: 0,
      invalid: 0,
      skipped: 0
    };

    sortTrainingRows(trainingInfo.trainingInfo.rows).forEach((row) => {
      const employeeId = tools.normalizeText(row["员工号"]);
      const name = tools.normalizeText(row["姓名"]);
      const projectName = tools.normalizeProjectName(row["项目名称"]);
      const infoEntered = tools.normalizeYes(row["培训信息是否录入"]);
      const startDate = tools.parseDate(row["培训开始日期"]);

      if (!infoEntered) {
        skippedRows.push(buildSkippedRow(row, projectName, "培训未录入", "培训信息是否录入不是“是”，本次跳过。"));
        stats.skipped += 1;
        return;
      }

      if (!startDate) {
        skippedRows.push(buildSkippedRow(row, projectName, "日期异常", "培训开始日期无法解析。"));
        stats.skipped += 1;
        return;
      }

      const rule = ruleMap.get(projectName);
      if (!rule || !rule.enabled) {
        skippedRows.push(buildSkippedRow(row, projectName, "规则缺失", "规则不存在或未启用。"));
        stats.skipped += 1;
        return;
      }

      const projectCol = context.projectColumns.get(projectName);
      if (projectCol === undefined || projectCol < 0) {
        skippedRows.push(buildSkippedRow(row, projectName, "项目列缺失", "有效期表中缺少同名项目列。"));
        stats.skipped += 1;
        return;
      }

      const target = resolvePeopleRow(row, context);
      if (target.error) {
        skippedRows.push(buildSkippedRow(row, projectName, "匹配失败", target.error));
        stats.skipped += 1;
        return;
      }

      stats.matched += 1;

      const rawOldExpiry = context.rows[target.rowIndex][projectCol];
      const oldExpiry = tools.parseDate(rawOldExpiry);
      const oldExpiryText = tools.formatDate(oldExpiry) || tools.normalizeText(rawOldExpiry) || "无";
      const computed = tools.computeExpiry(rule, startDate, oldExpiry);
      const judgement = tools.classifyUpdateJudgement(rule, startDate, oldExpiry);
      const outcome = tools.evaluateUpdateResult(oldExpiry, computed.newExpiry, today);
      const newExpiryText = tools.formatDate(computed.newExpiry);
      const reasonParts = [
        `匹配方式：${target.matchedBy}`,
        computed.reason,
        outcome.reason
      ].filter(Boolean);

      previewRows.push({
        rowNumber: row.__rowNumber,
        employeeId,
        name,
        projectName,
        oldExpiry: oldExpiryText,
        newExpiry: newExpiryText,
        judgement,
        result: outcome.result,
        reason: reasonParts.join("；")
      });

      if (outcome.result === "不变") {
        stats.unchanged += 1;
        return;
      }
      if (outcome.result === "有效期回退") {
        stats.rollback += 1;
        return;
      }
      if (outcome.result === "更新无效") {
        stats.invalid += 1;
        return;
      }

      context.rows[target.rowIndex][projectCol] = tools.cloneDate(computed.newExpiry);
      registerUpdatedCell(updatedCellMap, target.rowIndex, projectCol);
      stats.updated += 1;
    });

    return {
      headers: validityInfo.headers,
      previewRows,
      skippedRows,
      updatedRows: context.rows,
      updatedCellMap,
      sheetSummary: {
        ruleSheetName: trainingInfo.ruleInfo.name,
        trainingSheetName: trainingInfo.trainingInfo.name,
        validitySheetName: validityInfo.sheetName
      },
      stats
    };
  }

  function highlightUpdatedCells(sheet, updatedCellMap) {
    updatedCellMap.forEach((columns, rowIndex) => {
      columns.forEach((columnIndex) => {
        const address = window.XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
        if (!sheet[address]) return;
        sheet[address].s = tools.mergeStyle(sheet[address].s, UPDATED_CELL_STYLE);
      });
    });
  }

  function buildValidityResultWorkbook(result) {
    const workbook = window.XLSX.utils.book_new();
    const validityDateHeaders = result.headers.filter((header) => !["员工号", "姓名"].includes(header));

    const summaryRows = [
      ["项目", "内容"],
      ["规则表", result.sheetSummary.ruleSheetName],
      ["培训表", result.sheetSummary.trainingSheetName],
      ["有效期表", result.sheetSummary.validitySheetName],
      ["培训记录总数", result.stats.recordsTotal],
      ["命中可计算记录", result.stats.matched],
      ["已更新", result.stats.updated],
      ["不变", result.stats.unchanged],
      ["有效期回退", result.stats.rollback],
      ["更新无效", result.stats.invalid],
      ["跳过", result.stats.skipped]
    ];

    const previewRows = [
      ["培训表行号", "员工号", "姓名", "项目名称", "旧有效期", "新有效期", "判断", "处理结果", "说明"],
      ...result.previewRows.map((row) => [
        row.rowNumber,
        row.employeeId,
        row.name,
        row.projectName,
        row.oldExpiry,
        row.newExpiry,
        row.judgement,
        row.result,
        row.reason
      ])
    ];

    const skippedRows = [
      ["培训表行号", "姓名", "项目名称", "状态", "原因"],
      ...result.skippedRows.map((row) => [row.rowNumber, row.name, row.projectName, row.status, row.reason])
    ];

    const updatedRows = [
      result.headers,
      ...result.updatedRows.map((row) => row.map((value) => value ?? ""))
    ];

    const summarySheet = tools.buildSheet(summaryRows);
    const previewSheet = tools.buildSheet(previewRows, { dateHeaders: ["旧有效期", "新有效期"] });
    const skippedSheet = tools.buildSheet(skippedRows);
    const updatedSheet = tools.buildSheet(updatedRows, { dateHeaders: validityDateHeaders });

    highlightUpdatedCells(updatedSheet, result.updatedCellMap);

    window.XLSX.utils.book_append_sheet(workbook, summarySheet, "摘要");
    window.XLSX.utils.book_append_sheet(workbook, previewSheet, "更新预览");
    window.XLSX.utils.book_append_sheet(workbook, skippedSheet, "跳过记录");
    window.XLSX.utils.book_append_sheet(workbook, updatedSheet, "更新后有效期表");
    return workbook;
  }

  Object.assign(window.TrainingTools, {
    buildValidityResultWorkbook,
    buildValidityUpdate
  });
})();
