(function () {
  const tools = window.TrainingTools;

  function attachRank(rows) {
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }

  function buildBaseRow(employeeId, name, oldExpiry, windowInfo, classification, urgency) {
    return {
      employeeId,
      name,
      oldExpiry,
      windowStart: windowInfo.windowStart ? tools.formatDate(windowInfo.windowStart) : "",
      windowEnd: windowInfo.windowEnd ? tools.formatDate(windowInfo.windowEnd) : "",
      priorityLabel: urgency.label,
      priorityRank: urgency.rank,
      status: classification.status,
      reason: classification.reason
    };
  }

  function sortRows(rows, key) {
    return rows.sort((left, right) => {
      if ((right.priorityRank || 0) !== (left.priorityRank || 0)) {
        return (right.priorityRank || 0) - (left.priorityRank || 0);
      }
      const leftValue = left[key] || "";
      const rightValue = right[key] || "";
      return leftValue.localeCompare(rightValue) || left.employeeId.localeCompare(right.employeeId) || left.name.localeCompare(right.name);
    });
  }

  function buildScheduleResult(ruleWorkbook, validityWorkbook, projectName, stageStart, stageEnd) {
    const ruleInfo = tools.readRuleWorkbook(ruleWorkbook);
    const validityInfo = tools.readValidityWorkbook(validityWorkbook);
    const rule = ruleInfo.ruleMap.get(projectName);

    if (!rule || !rule.enabled) {
      throw new Error(`当前项目“${projectName}”未在导入的规则表中识别为启用项目。`);
    }

    const employeeCol = validityInfo.headers.findIndex((item) => item === "员工号");
    const nameCol = validityInfo.headers.findIndex((item) => item === "姓名");
    const projectCol = validityInfo.headers.findIndex((item) => tools.normalizeProjectName(item) === projectName);

    if (projectCol < 0) {
      throw new Error(`有效期表第一张工作表里没有“${projectName}”这一列。`);
    }

    const expired = [];
    const windowRows = [];
    const stageDueRows = [];
    const missingExpiry = [];
    const ignored = [];
    let checked = 0;
    let priority30 = 0;
    let priority60 = 0;
    let priority90 = 0;

    validityInfo.rows.forEach((row) => {
      const employeeId = tools.normalizeText(row[employeeCol]);
      const name = tools.normalizeText(row[nameCol]);
      if (!employeeId && !name) return;

      checked += 1;

      const rawExpiry = row[projectCol];
      const oldExpiryDate = tools.parseDate(rawExpiry);
      const rawExpiryText = tools.normalizeText(rawExpiry);
      const oldExpiryText = tools.formatDate(oldExpiryDate) || rawExpiryText;

      if (!oldExpiryDate) {
        if (rawExpiryText && !tools.isNullLikeText(rawExpiryText)) {
          missingExpiry.push({
            employeeId,
            name,
            oldExpiry: oldExpiryText,
            windowStart: "",
            windowEnd: "",
            status: "缺少旧有效期",
            reason: `当前有效期“${rawExpiryText}”无法解析为日期。`
          });
        }
        return;
      }

      const classification = tools.classifyScheduleStageStatus(rule, stageStart, stageEnd, oldExpiryDate);
      const urgency = tools.classifyScheduleUrgency(rule, stageStart, stageEnd, oldExpiryDate, classification.status);
      const baseRow = buildBaseRow(
        employeeId,
        name,
        oldExpiryText,
        classification.windowInfo,
        classification,
        urgency
      );

      if (urgency.label === "30天内到期") priority30 += 1;
      if (urgency.label === "60天内到期") priority60 += 1;
      if (urgency.label === "90天内到期") priority90 += 1;

      if (classification.status === "已过期") {
        expired.push(baseRow);
        return;
      }
      if (classification.status === "命中窗口") {
        windowRows.push(baseRow);
        return;
      }
      if (classification.status === "本阶段到期") {
        stageDueRows.push(baseRow);
        return;
      }
      ignored.push(baseRow);
    });

    sortRows(expired, "oldExpiry");
    sortRows(windowRows, "windowEnd");
    sortRows(stageDueRows, "oldExpiry");
    sortRows(missingExpiry, "employeeId");
    sortRows(ignored, "windowStart");

    return {
      projectName,
      stageStart: tools.formatDate(stageStart),
      stageEnd: tools.formatDate(stageEnd),
      expiredRows: attachRank(expired),
      windowRows: attachRank(windowRows),
      stageDueRows: attachRank(stageDueRows),
      missingExpiry: attachRank(missingExpiry),
      ignored: attachRank(ignored),
      sheetSummary: {
        ruleSheetName: ruleInfo.sheetName,
        validitySheetName: validityInfo.sheetName
      },
      stats: {
        checked,
        total: expired.length + windowRows.length + stageDueRows.length + missingExpiry.length + ignored.length,
        schedule: expired.length + windowRows.length + stageDueRows.length,
        expired: expired.length,
        windowHits: windowRows.length,
        stageDue: stageDueRows.length,
        priority30,
        priority60,
        priority90,
        missingExpiry: missingExpiry.length,
        ignored: ignored.length
      }
    };
  }

  function buildScheduleWorkbook(result, rule) {
    const workbook = window.XLSX.utils.book_new();
    const dateHeaders = ["旧有效期", "窗口开始", "窗口结束"];

    const summaryRows = [
      ["项目", result.projectName],
      ["预排开始日期", result.stageStart],
      ["预排结束日期", result.stageEnd],
      ["规则表来源", result.sheetSummary.ruleSheetName],
      ["有效期表来源", result.sheetSummary.validitySheetName],
      ["规则类型", rule.ruleType],
      ["有效期", tools.formatRuleDuration(rule)],
      ["窗口口径", tools.formatWindowText(rule)],
      ["检查人数", result.stats.checked],
      ["预排名单", result.stats.schedule],
      ["已过期", result.stats.expired],
      ["命中窗口", result.stats.windowHits],
      ["本阶段到期", result.stats.stageDue],
      ["30天内到期", result.stats.priority30],
      ["60天内到期", result.stats.priority60],
      ["90天内到期", result.stats.priority90],
      ["缺少旧有效期", result.stats.missingExpiry],
      ["未命中窗口 / 阶段外未到期", result.stats.ignored]
    ];

    const buildRows = (rows) => [
      ["排序", "员工号", "姓名", "旧有效期", "窗口开始", "窗口结束", "轻重缓急", "状态", "说明"],
      ...rows.map((row) => [
        row.rank,
        row.employeeId,
        row.name,
        row.oldExpiry,
        row.windowStart,
        row.windowEnd,
        row.priorityLabel,
        row.status,
        row.reason
      ])
    ];

    window.XLSX.utils.book_append_sheet(workbook, tools.buildSheet(summaryRows), "摘要");
    window.XLSX.utils.book_append_sheet(workbook, tools.buildSheet(buildRows(result.expiredRows), { dateHeaders }), "已过期");
    window.XLSX.utils.book_append_sheet(workbook, tools.buildSheet(buildRows(result.windowRows), { dateHeaders }), "命中窗口");
    window.XLSX.utils.book_append_sheet(workbook, tools.buildSheet(buildRows(result.stageDueRows), { dateHeaders }), "本阶段到期");
    window.XLSX.utils.book_append_sheet(workbook, tools.buildSheet(buildRows(result.missingExpiry), { dateHeaders }), "缺少旧有效期");
    window.XLSX.utils.book_append_sheet(workbook, tools.buildSheet(buildRows(result.ignored), { dateHeaders }), "未命中窗口");
    return workbook;
  }

  Object.assign(window.TrainingTools, {
    buildScheduleResult,
    buildScheduleWorkbook
  });
})();
