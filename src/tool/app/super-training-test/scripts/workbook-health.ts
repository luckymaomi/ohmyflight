(function () {
  const Config = window.SuperTraining.Config;
  const Utils = window.SuperTraining.Utils;
  const TrainingRecordPolicy = window.SuperTraining.TrainingRecordPolicy;
  const CrmAnnual = window.SuperTraining.CrmAnnual;

  const LEVELS = {
    error: "严重",
    warning: "警告",
    info: "提示"
  };

  function createResult() {
    return {
      items: [],
      summary: {
        error: 0,
        warning: 0,
        info: 0
      }
    };
  }

  function addItem(result, level, area, message, detail = "") {
    result.items.push({ level, levelLabel: LEVELS[level] || level, area, message, detail });
    result.summary[level] += 1;
  }

  function hasHeader(sheetInfo, headerName) {
    return sheetInfo && sheetInfo.headerMap && sheetInfo.headerMap.has(Utils.normalizeText(headerName));
  }

  function getRowPersonLabel(row, sheetInfo) {
    const employeeId = Utils.normalizeText(Utils.getValueByHeader(row, sheetInfo, "员工号"));
    const name = Utils.normalizeText(Utils.getValueByHeader(row, sheetInfo, "姓名"));
    return [employeeId, name].filter(Boolean).join(" / ") || `第${row.rowNumber}行`;
  }

  function checkPeopleSheet(result, analysis) {
    const peopleInfo = analysis.peopleInfo;
    addItem(result, "info", "人员信息表", `识别到人员信息表“${peopleInfo.name}”，共 ${peopleInfo.rows.length} 行。`);

    ["员工号", "姓名"].forEach((header) => {
      if (!hasHeader(peopleInfo, header)) {
        addItem(result, "error", "人员信息表", `缺少必要表头“${header}”。`);
      }
    });

    ["分部", "技术信息", "是否运行", "备注"].forEach((header) => {
      if (!hasHeader(peopleInfo, header)) {
        addItem(result, "warning", "人员信息表", `缺少建议表头“${header}”。`, "相关展示或 CRM 分类可能不完整。");
      }
    });

    const employeeRows = new Map();
    peopleInfo.rows.forEach((row) => {
      const employeeId = Utils.normalizeText(Utils.getValueByHeader(row, peopleInfo, "员工号"));
      const name = Utils.normalizeText(Utils.getValueByHeader(row, peopleInfo, "姓名"));
      if (!employeeId && !name) {
        addItem(result, "warning", "人员信息表", `第${row.rowNumber}行缺少员工号和姓名。`);
      }
      if (!employeeId) return;
      const rows = employeeRows.get(employeeId) || [];
      rows.push(row.rowNumber);
      employeeRows.set(employeeId, rows);
    });

    employeeRows.forEach((rows, employeeId) => {
      if (rows.length > 1) {
        addItem(result, "warning", "人员信息表", `员工号 ${employeeId} 重复出现。`, `行号：${rows.join("、")}`);
      }
    });
  }

  function checkProjectSheetRows(result, project) {
    const sheetInfo = project.sheetInfo;
    if (!sheetInfo) return;

    sheetInfo.rows.forEach((row) => {
      const label = getRowPersonLabel(row, sheetInfo);
      const recordState = TrainingRecordPolicy.classify(row, sheetInfo);
      const startRaw = Utils.getValueByHeader(row, sheetInfo, "培训开始日期");
      const endRaw = Utils.getValueByHeader(row, sheetInfo, "培训结束日期");
      const hasStart = Utils.hasMeaningfulValue(startRaw);
      const hasEnd = Utils.hasMeaningfulValue(endRaw);
      const startDate = Utils.parseDate(startRaw);
      const endDate = Utils.parseDate(endRaw);

      if (recordState.abnormal) {
        addItem(result, "warning", project.canonical, `${label} 数据矛盾。`, `${project.sheetName} 第${row.rowNumber}行：${recordState.reason}`);
      }

      if ((hasStart && !startDate) || (hasEnd && !endDate)) {
        addItem(result, "warning", project.canonical, `${label} 培训日期无法解析。`, `${project.sheetName} 第${row.rowNumber}行`);
      }

      if (recordState.active && !startDate && !endDate) {
        addItem(result, "warning", project.canonical, `${label} 缺少可用培训日期。`, `${project.sheetName} 第${row.rowNumber}行`);
      }
    });
  }

  function checkProjects(result, analysis) {
    const expectedNames = Config.PROJECT_RULES
      .filter((rule) => rule.enabled)
      .map((rule) => rule.canonical);
    const recognized = new Set(analysis.projects.map((project) => project.canonical));

    expectedNames.forEach((projectName) => {
      if (!recognized.has(projectName)) {
        addItem(result, "warning", "培训项目", `未识别到“${projectName}”项目 sheet。`);
      }
    });

    analysis.projects.forEach((project) => {
      addItem(
        result,
        "info",
        project.canonical,
        `识别到项目 sheet“${project.sheetName}”。`,
        `已录入 ${project.recordedRowCount} 行，未录入 ${project.pendingRowCount} 行。`
      );

      if (project.peopleColumnIndex < 0) {
        addItem(result, "warning", project.canonical, "人员信息表中没有对应有效期列。", "排班总览无法按人员当前有效期判断该项目。");
      }

      checkProjectSheetRows(result, project);
    });
  }

  function checkCrm(result, workbook, analysis, scanner, yearValue) {
    const year = CrmAnnual.normalizeYear(yearValue || new Date().getFullYear());
    const crmLikeSheets = workbook.SheetNames.filter((name) => Utils.normalizeText(name).includes("CRM"));
    const hasExactCrm = workbook.Sheets[CrmAnnual.CRM_SHEET_NAME];

    crmLikeSheets
      .filter((name) => name !== CrmAnnual.CRM_SHEET_NAME)
      .forEach((name) => {
        addItem(result, "info", "CRM", `发现工作表“${name}”，系统不会作为当年 CRM 核对来源。`);
      });

    if (!hasExactCrm) {
      addItem(result, "warning", "CRM", "未找到精确名为“CRM”的工作表。");
      return;
    }

    const crmSheet = scanner.readSheetInfo(workbook, CrmAnnual.CRM_SHEET_NAME);
    ["员工号", "姓名", "培训开始日期", "培训结束日期", "备注"].forEach((header) => {
      if (!hasHeader(crmSheet, header)) {
        addItem(result, "warning", "CRM", `CRM 工作表缺少表头“${header}”。`);
      }
    });

    const crmResult = CrmAnnual.buildAnnualCheck(workbook, analysis, scanner, year);
    const unrecognized = (crmResult.roleRows || []).find((row) => row.role === "未识别");
    addItem(
      result,
      "info",
      "CRM",
      `${year} 年 CRM 核对可生成。`,
      `应参加 ${crmResult.stats.required} 人，已参加 ${crmResult.stats.attended} 人，未参加 ${crmResult.stats.missing} 人。`
    );
    if (unrecognized && unrecognized.required) {
      addItem(result, "warning", "CRM", `有 ${unrecognized.required} 名 CRM 应参加人员技术等级未识别。`);
    }
  }

  function checkIgnoredSheets(result, workbook, analysis) {
    const usedSheets = new Set([
      analysis.peopleInfo.name,
      ...analysis.projects.map((project) => project.sheetName).filter(Boolean),
      CrmAnnual.CRM_SHEET_NAME
    ]);
    workbook.SheetNames
      .filter((sheetName) => !usedSheets.has(sheetName))
      .forEach((sheetName) => {
        addItem(result, "info", "未纳入监控", `工作表“${sheetName}”当前不参与超级培训监控。`);
      });
  }

  function buildWorkbookHealth(workbook, analysis, scanner, options = {}) {
    const healthOptions = options as { crmYear?: unknown };
    const result = createResult();
    if (!workbook || !analysis) {
      addItem(result, "error", "工作簿", "未导入可检查的工作簿。");
      return result;
    }

    checkPeopleSheet(result, analysis);
    checkProjects(result, analysis);
    checkCrm(result, workbook, analysis, scanner, healthOptions.crmYear);
    checkIgnoredSheets(result, workbook, analysis);

    return result;
  }

  window.SuperTraining.WorkbookHealth = {
    buildWorkbookHealth
  };
})();
