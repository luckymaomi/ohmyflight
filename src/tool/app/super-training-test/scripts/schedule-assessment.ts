(function () {
  const Utils = window.SuperTraining.Utils;
  const RuleEngine = window.SuperTraining.RuleEngine;
  const TrainingRecordPolicy = window.SuperTraining.TrainingRecordPolicy;
  const TrainingIgnoreList = window.SuperTraining.TrainingIgnoreList;

  const STATUSES = {
    expired: "已过期",
    expiredScheduled: "已过期已排补训",
    must: "必须排",
    recommended: "推荐排",
    uncoveredScheduled: "已排未覆盖",
    scheduledPending: "已排未录入",
    recordedPendingUpdate: "已录入待更新",
    normal: "正常",
    abnormal: "异常"
  };

  const DEFAULT_VISIBLE_STATUSES = new Set([
    STATUSES.expired,
    STATUSES.expiredScheduled,
    STATUSES.must,
    STATUSES.recommended,
    STATUSES.uncoveredScheduled,
    STATUSES.abnormal
  ]);

  const STATUS_ORDER = new Map([
    [STATUSES.expired, 0],
    [STATUSES.expiredScheduled, 1],
    [STATUSES.must, 2],
    [STATUSES.uncoveredScheduled, 3],
    [STATUSES.recommended, 4],
    [STATUSES.abnormal, 5],
    [STATUSES.scheduledPending, 6],
    [STATUSES.recordedPendingUpdate, 7],
    [STATUSES.normal, 8]
  ]);

  const VISIBLE_STATUS_FIELDS = [
    { status: STATUSES.expired, field: "expired" },
    { status: STATUSES.expiredScheduled, field: "expiredScheduled" },
    { status: STATUSES.must, field: "must" },
    { status: STATUSES.uncoveredScheduled, field: "uncoveredScheduled" },
    { status: STATUSES.recommended, field: "recommended" },
    { status: STATUSES.abnormal, field: "abnormal" }
  ];

  type AssessmentFilters = {
    projects?: string[];
    statuses?: string[];
    months?: string[];
    searchText?: string;
  };

  function getRowTrainingDate(row, sheetInfo) {
    return Utils.parseDate(Utils.getValueByHeader(row, sheetInfo, "培训开始日期"))
      || Utils.parseDate(Utils.getValueByHeader(row, sheetInfo, "培训结束日期"));
  }

  function samePerson(candidate, row, sheetInfo) {
    const rowEmployeeId = Utils.normalizeText(Utils.getValueByHeader(row, sheetInfo, "员工号"));
    const rowName = Utils.normalizeText(Utils.getValueByHeader(row, sheetInfo, "姓名"));

    if (candidate.employeeId && rowEmployeeId) {
      return candidate.employeeId === rowEmployeeId;
    }

    if (!candidate.name || !rowName) {
      return false;
    }

    return candidate.name === rowName;
  }

  function addMonths(value, months) {
    const totalMonth = value.getMonth() + months;
    const year = value.getFullYear() + Math.floor(totalMonth / 12);
    const month = ((totalMonth % 12) + 12) % 12 + 1;
    const day = Math.min(value.getDate(), new Date(year, month, 0).getDate());
    return Utils.makeDate(year, month, day);
  }

  function firstDayOfMonth(value) {
    return Utils.makeDate(value.getFullYear(), value.getMonth() + 1, 1);
  }

  function monthEnd(value) {
    return Utils.makeDate(value.getFullYear(), value.getMonth() + 1, new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate());
  }

  function createTodayDate() {
    return RuleEngine.createTodayDate();
  }

  function getDefaultStageEnd(today) {
    return monthEnd(today);
  }

  function buildCandidateMatches(project, candidate) {
    if (!project.sheetInfo || !project.sheetInfo.rows) return [];

    return project.sheetInfo.rows
      .filter((row) => samePerson(candidate, row, project.sheetInfo))
      .map((row) => {
        const trainingDate = getRowTrainingDate(row, project.sheetInfo);
        const recordState = TrainingRecordPolicy.classify(row, project.sheetInfo);
        const coverage = recordState.active
          ? RuleEngine.evaluatePlanCoverage(project.rule, trainingDate, candidate.expiry)
          : {
            covered: false,
            reason: recordState.reason
          };
        return {
          rowNumber: row.rowNumber,
          source: `${project.sheetName} 第${row.rowNumber}行`,
          trainingDate,
          trainingDateText: Utils.formatDate(trainingDate),
          recorded: recordState.recorded,
          recordState,
          covered: coverage.covered,
          dueDate: coverage.dueDate,
          reason: coverage.reason
        };
      })
      .sort((left, right) => {
        const leftTime = left.trainingDate ? left.trainingDate.getTime() : Number.POSITIVE_INFINITY;
        const rightTime = right.trainingDate ? right.trainingDate.getTime() : Number.POSITIVE_INFINITY;
        return leftTime - rightTime || left.rowNumber - right.rowNumber;
      });
  }

  function getNoWindowRecommendationStart(expiry) {
    return firstDayOfMonth(addMonths(expiry, -1));
  }

  function classifySchedulingNeed(rule, stageStart, stageEnd, expiry) {
    const windowInfo = RuleEngine.getWindowInfo(rule, expiry);
    const coverageInfo = RuleEngine.evaluatePlanCoverage(rule, expiry, expiry);
    const dueDate = coverageInfo.dueDate || expiry;

    if (dueDate < stageStart) {
      return {
        status: STATUSES.expired,
        dueDate,
        dueMonth: Utils.toMonthKey(dueDate),
        windowInfo,
        reason: `当前有效期已过期，最晚完成日期为 ${Utils.formatDate(dueDate)}。`
      };
    }

    if (dueDate >= stageStart && dueDate <= stageEnd) {
      return {
        status: STATUSES.must,
        dueDate,
        dueMonth: Utils.toMonthKey(dueDate),
        windowInfo,
        reason: `本月不处理就会过期，最晚完成日期为 ${Utils.formatDate(dueDate)}。`
      };
    }

    if (windowInfo.hasWindow && Utils.rangesOverlap(stageStart, stageEnd, windowInfo.windowStart, windowInfo.windowEnd)) {
      return {
        status: STATUSES.recommended,
        dueDate,
        dueMonth: Utils.toMonthKey(dueDate),
        windowInfo,
        reason: `已进入${windowInfo.tag}，建议提前安排。${windowInfo.detail}`
      };
    }

    if (!windowInfo.hasWindow) {
      const recommendStart = getNoWindowRecommendationStart(dueDate);
      const recommendEnd = dueDate;
      if (Utils.rangesOverlap(stageStart, stageEnd, recommendStart, recommendEnd)) {
        return {
          status: STATUSES.recommended,
          dueDate,
          dueMonth: Utils.toMonthKey(dueDate),
          windowInfo,
          reason: `项目无窗口期，已进入管理提前期 ${Utils.formatDate(recommendStart)} 至 ${Utils.formatDate(recommendEnd)}，建议提前安排。`
        };
      }
    }

    return {
      status: STATUSES.normal,
      dueDate,
      dueMonth: Utils.toMonthKey(dueDate),
      windowInfo,
      reason: `当前有效期为 ${Utils.formatDate(expiry)}，本阶段不用处理。`
    };
  }

  function buildAssessmentRows(analysis, project, stageStart, stageEnd) {
    const rows = [];

    analysis.peopleInfo.rows.forEach((row) => {
      const employeeId = Utils.normalizeText(row.cells[analysis.peopleIndex.employeeColumnIndex]);
      const name = Utils.normalizeText(row.cells[analysis.peopleIndex.nameColumnIndex]);
      if (!employeeId && !name) return;
      if (TrainingIgnoreList.shouldIgnore({ employeeId, name }, project.canonical)) return;

      const rawExpiry = row.cells[project.peopleColumnIndex];
      const expiry = Utils.parseDate(rawExpiry);
      const expiryText = Utils.formatDate(expiry) || Utils.normalizeText(rawExpiry);
      const source = `${analysis.peopleInfo.name} 第${row.rowNumber}行`;

      if (!expiry) {
        if (Utils.normalizeText(rawExpiry) && !Utils.isNullLikeText(rawExpiry)) {
          rows.push({
            status: STATUSES.abnormal,
            projectName: project.canonical,
            employeeId,
            name,
            expiry: expiryText,
            dueMonth: "",
            dueDate: "",
            scheduledDate: "",
            recorded: "",
            source,
            reason: `当前有效期“${Utils.normalizeText(rawExpiry)}”无法解析为日期。`
          });
        }
        return;
      }

      const candidate = { employeeId, name, expiry };
      const matches = buildCandidateMatches(project, candidate);
      const abnormalMatches = matches.filter((item) => item.recordState && item.recordState.abnormal);
      const activeMatches = matches.filter((item) => item.recordState && item.recordState.active);
      const coveredMatches = matches.filter((item) => item.covered);
      const recordedCovered = coveredMatches.filter((item) => item.recorded);
      const earliestActive = activeMatches[0];
      const earliestCovered = coveredMatches[0];
      const earliestRecordedCovered = recordedCovered[0];
      const scheduleNeed = classifySchedulingNeed(project.rule, stageStart, stageEnd, expiry);

      let status = scheduleNeed.status;
      let reason = scheduleNeed.reason;
      let rowSource = source;

      if (abnormalMatches.length) {
        status = STATUSES.abnormal;
        reason = `${abnormalMatches[0].recordState.reason}（项目 sheet 第${abnormalMatches[0].rowNumber}行）`;
        rowSource = abnormalMatches[0].source;
      } else if (earliestRecordedCovered) {
        status = STATUSES.recordedPendingUpdate;
        reason = "已找到可覆盖本轮到期的已录入记录，人员信息表仍是旧有效期，建议执行有效期更新。";
        rowSource = earliestRecordedCovered.source;
      } else if (coveredMatches.length) {
        status = STATUSES.scheduledPending;
        reason = "已找到可覆盖本轮到期的安排，但未发现已录入信息，排班层面不用重复排。";
        rowSource = earliestCovered.source;
      } else if (activeMatches.length && scheduleNeed.status === STATUSES.expired) {
        status = STATUSES.expiredScheduled;
        reason = `当前有效期已过期，已有安排 ${earliestActive.trainingDateText || "日期无法解析"}，但不能覆盖本轮到期。${earliestActive.reason}`;
        rowSource = earliestActive.source;
      } else if (activeMatches.length && (
        scheduleNeed.status === STATUSES.must || scheduleNeed.status === STATUSES.recommended
      )) {
        status = STATUSES.uncoveredScheduled;
        reason = `已有安排 ${earliestActive.trainingDateText || "日期无法解析"}，但不能覆盖本轮到期。${earliestActive.reason}`;
        rowSource = earliestActive.source;
      } else if (scheduleNeed.status === STATUSES.expired) {
        reason = "当前有效期已过期，且未找到可覆盖本轮到期的安排。";
      } else if (scheduleNeed.status === STATUSES.must) {
        reason = `未找到可覆盖本轮到期的安排。${scheduleNeed.reason}`;
      } else if (scheduleNeed.status === STATUSES.recommended) {
        reason = `未找到可覆盖本轮到期的安排。${scheduleNeed.reason}`;
      }

      rows.push({
        status,
        projectName: project.canonical,
        employeeId,
        name,
        expiry: Utils.formatDate(expiry),
        dueMonth: scheduleNeed.dueMonth,
        dueDate: Utils.formatDate(scheduleNeed.dueDate),
        scheduledDate: earliestCovered ? earliestCovered.trainingDateText : (earliestActive ? earliestActive.trainingDateText : ""),
        recorded: earliestCovered || earliestActive ? (recordedCovered.length ? "是" : "否") : "",
        source: rowSource,
        reason
      });
    });

    return rows;
  }

  function sortRows(rows) {
    rows.sort((left, right) => {
      const leftRank = STATUS_ORDER.has(left.status) ? STATUS_ORDER.get(left.status) : 99;
      const rightRank = STATUS_ORDER.has(right.status) ? STATUS_ORDER.get(right.status) : 99;
      return leftRank - rightRank
        || left.dueDate.localeCompare(right.dueDate)
        || left.projectName.localeCompare(right.projectName)
        || left.name.localeCompare(right.name);
    });
    return rows;
  }

  function buildRows(analysis, options: { today?: Date; stageEnd?: Date } = {}) {
    const stageStart = options.today || createTodayDate();
    const stageEnd = options.stageEnd || getDefaultStageEnd(stageStart);
    const rows = [];

    analysis.projects
      .filter((project) => project.peopleColumnIndex >= 0)
      .forEach((project) => {
        rows.push(...buildAssessmentRows(analysis, project, stageStart, stageEnd));
      });

    return {
      stageStart,
      stageEnd,
      rows: sortRows(rows)
    };
  }

  function normalizeFilterSet(values) {
    return new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Utils.normalizeText(value))
        .filter(Boolean)
    );
  }

  function includesSearch(row, searchText) {
    const keyword = Utils.normalizeText(searchText);
    if (!keyword) return true;
    return [
      row.projectName,
      row.employeeId,
      row.name,
      row.expiry,
      row.dueMonth,
      row.scheduledDate,
      row.source,
      row.reason
    ].some((value) => Utils.normalizeText(value).includes(keyword));
  }

  function filterRows(rows, filters: AssessmentFilters = {}) {
    const projectSet = normalizeFilterSet(filters.projects);
    const statusSet = normalizeFilterSet(filters.statuses);
    const monthSet = normalizeFilterSet(filters.months);
    const hasExplicitStatusFilter = statusSet.size > 0;

    return rows.filter((row) => {
      if (projectSet.size && !projectSet.has(row.projectName)) return false;
      if (hasExplicitStatusFilter && !statusSet.has(row.status)) return false;
      if (!hasExplicitStatusFilter && !DEFAULT_VISIBLE_STATUSES.has(row.status)) return false;
      if (monthSet.size && !monthSet.has(row.dueMonth)) return false;
      return includesSearch(row, filters.searchText);
    });
  }

  function countRows(rows) {
    return rows.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});
  }

  function buildStatsCards(rows) {
    const counts = countRows(rows);
    return [
      { label: STATUSES.expired, value: counts[STATUSES.expired] || 0 },
      { label: STATUSES.expiredScheduled, value: counts[STATUSES.expiredScheduled] || 0 },
      { label: STATUSES.must, value: counts[STATUSES.must] || 0 },
      { label: STATUSES.uncoveredScheduled, value: counts[STATUSES.uncoveredScheduled] || 0 },
      { label: STATUSES.recommended, value: counts[STATUSES.recommended] || 0 },
      { label: STATUSES.scheduledPending, value: counts[STATUSES.scheduledPending] || 0 },
      { label: "待更新", value: counts[STATUSES.recordedPendingUpdate] || 0 },
      { label: STATUSES.abnormal, value: counts[STATUSES.abnormal] || 0 }
    ];
  }

  function uniqueSortedText(values, sort = true): string[] {
    const result = [...new Set(values.map((value) => String(value || "")).filter(Boolean))] as string[];
    return sort ? result.sort((left, right) => left.localeCompare(right)) : result;
  }

  function buildFilterOptions(rows) {
    return {
      projects: uniqueSortedText(rows.map((row) => row.projectName)),
      statuses: uniqueSortedText(rows.map((row) => row.status), false),
      months: uniqueSortedText(rows.map((row) => row.dueMonth))
    };
  }

  function buildStatusChartRows(rows) {
    const counts = countRows(rows);
    return VISIBLE_STATUS_FIELDS.map((item) => ({
      name: item.status,
      value: counts[item.status] || 0
    }));
  }

  function buildProjectChartRows(rows) {
    const projectMap = new Map();
    rows.forEach((row) => {
      if (!DEFAULT_VISIBLE_STATUSES.has(row.status)) return;
      if (!projectMap.has(row.projectName)) {
        projectMap.set(row.projectName, {
          projectName: row.projectName,
          expired: 0,
          expiredScheduled: 0,
          must: 0,
          uncoveredScheduled: 0,
          recommended: 0,
          abnormal: 0
        });
      }
      const item = projectMap.get(row.projectName);
      const statusField = VISIBLE_STATUS_FIELDS.find((entry) => entry.status === row.status);
      if (statusField) item[statusField.field] += 1;
    });
    return [...projectMap.values()].sort((left, right) => {
      const leftTotal = VISIBLE_STATUS_FIELDS.reduce((total, item) => total + left[item.field], 0);
      const rightTotal = VISIBLE_STATUS_FIELDS.reduce((total, item) => total + right[item.field], 0);
      return rightTotal - leftTotal || left.projectName.localeCompare(right.projectName);
    });
  }

  function createStatusBucket(label) {
    return {
      label,
      expired: 0,
      expiredScheduled: 0,
      must: 0,
      uncoveredScheduled: 0,
      recommended: 0,
      abnormal: 0
    };
  }

  function incrementStatusBucket(item, status) {
    const statusField = VISIBLE_STATUS_FIELDS.find((entry) => entry.status === status);
    if (statusField) item[statusField.field] += 1;
  }

  function buildMonthChartRows(rows) {
    const monthMap = new Map();
    rows.forEach((row) => {
      if (!DEFAULT_VISIBLE_STATUSES.has(row.status)) return;
      const monthKey = row.dueMonth || "无月份";
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, createStatusBucket(monthKey));
      }
      incrementStatusBucket(monthMap.get(monthKey), row.status);
    });
    return [...monthMap.values()].sort((left, right) => left.label.localeCompare(right.label));
  }

  function createProjectSummaryItem(projectName) {
    return {
      projectName,
      expired: 0,
      expiredScheduled: 0,
      must: 0,
      uncoveredScheduled: 0,
      recommended: 0,
      abnormal: 0,
      total: 0,
      rowsByStatus: {
        [STATUSES.expired]: [],
        [STATUSES.expiredScheduled]: [],
        [STATUSES.must]: [],
        [STATUSES.uncoveredScheduled]: [],
        [STATUSES.recommended]: [],
        [STATUSES.abnormal]: []
      }
    };
  }

  function incrementProjectSummary(item, row) {
    const status = row.status;
    const statusField = VISIBLE_STATUS_FIELDS.find((entry) => entry.status === status);
    if (statusField) item[statusField.field] += 1;
    if (item.rowsByStatus[status]) item.rowsByStatus[status].push(row);
    item.total += 1;
  }

  function buildProjectSummaryRows(rows) {
    const projectMap = new Map();
    rows.forEach((row) => {
      if (!DEFAULT_VISIBLE_STATUSES.has(row.status)) return;
      if (!projectMap.has(row.projectName)) {
        projectMap.set(row.projectName, createProjectSummaryItem(row.projectName));
      }
      incrementProjectSummary(projectMap.get(row.projectName), row);
    });
    return [...projectMap.values()].sort((left, right) => {
      return right.total - left.total
        || right.expired - left.expired
        || right.expiredScheduled - left.expiredScheduled
        || right.must - left.must
        || right.uncoveredScheduled - left.uncoveredScheduled
        || right.recommended - left.recommended
        || left.projectName.localeCompare(right.projectName);
    });
  }

  function buildProjectGroups(rows) {
    const groupMap = new Map();
    rows.forEach((row) => {
      if (!DEFAULT_VISIBLE_STATUSES.has(row.status)) return;
      const key = `${row.projectName}@@${row.status}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          projectName: row.projectName,
          status: row.status,
          rows: []
        });
      }
      groupMap.get(key).rows.push(row);
    });
    return [...groupMap.values()]
      .map((group) => ({
        ...group,
        total: group.rows.length,
        rows: group.rows.slice(0, 80)
      }))
      .sort((left, right) => {
        const leftRank = STATUS_ORDER.has(left.status) ? STATUS_ORDER.get(left.status) : 99;
        const rightRank = STATUS_ORDER.has(right.status) ? STATUS_ORDER.get(right.status) : 99;
        return left.projectName.localeCompare(right.projectName)
          || leftRank - rightRank;
      });
  }

  function parseDisplayDate(value) {
    return Utils.parseDate(value);
  }

  function buildPersonRiskRows(rows) {
    const personMap = new Map();
    rows.forEach((row) => {
      if (!DEFAULT_VISIBLE_STATUSES.has(row.status)) return;
      const key = row.employeeId || row.name;
      if (!key) return;
      if (!personMap.has(key)) {
        personMap.set(key, {
          employeeId: row.employeeId,
          name: row.name,
          expired: 0,
          expiredScheduled: 0,
          must: 0,
          uncoveredScheduled: 0,
          recommended: 0,
          abnormal: 0,
          total: 0,
          nearestDueDate: "",
          items: []
        });
      }
      const item = personMap.get(key);
      const statusField = VISIBLE_STATUS_FIELDS.find((entry) => entry.status === row.status);
      if (statusField) item[statusField.field] += 1;
      item.total += 1;
      item.items.push({
        status: row.status,
        projectName: row.projectName,
        dueDate: row.dueDate,
        expiry: row.expiry,
        reason: row.reason
      });

      const dueDate = parseDisplayDate(row.dueDate || row.expiry);
      const currentNearest = parseDisplayDate(item.nearestDueDate);
      if (dueDate && (!currentNearest || dueDate < currentNearest)) {
        item.nearestDueDate = Utils.formatDate(dueDate);
      }
    });

    return [...personMap.values()].sort((left, right) => {
      const leftDue = parseDisplayDate(left.nearestDueDate);
      const rightDue = parseDisplayDate(right.nearestDueDate);
      const dueSort = leftDue && rightDue ? leftDue.getTime() - rightDue.getTime() : 0;
      return right.expired - left.expired
        || right.expiredScheduled - left.expiredScheduled
        || right.must - left.must
        || right.uncoveredScheduled - left.uncoveredScheduled
        || right.recommended - left.recommended
        || right.abnormal - left.abnormal
        || dueSort
        || left.name.localeCompare(right.name);
    });
  }

  function buildSummaryData(rows) {
    return {
      projectSummaryRows: buildProjectSummaryRows(rows),
      projectGroups: buildProjectGroups(rows),
      personRiskRows: buildPersonRiskRows(rows)
    };
  }

  function buildChartData(rows) {
    return {
      statusRows: buildStatusChartRows(rows),
      projectRows: buildProjectChartRows(rows),
      monthRows: buildMonthChartRows(rows)
    };
  }

  function buildResult(analysis, options: { today?: Date; stageEnd?: Date; filters?: AssessmentFilters } = {}) {
    const assessment = buildRows(analysis, options);
    const allRows = assessment.rows;
    const detailRows = filterRows(allRows, options.filters || {});
    const hasExplicitStatusFilter = normalizeFilterSet((options.filters || {}).statuses).size > 0;

    return {
      summaryText: hasExplicitStatusFilter
        ? `排班总览显示 ${detailRows.length} 条，原始扫描 ${allRows.length} 条。`
        : `排班总览默认显示 ${detailRows.length} 条待处理或异常记录，原始扫描 ${allRows.length} 条。`,
      statsCards: buildStatsCards(detailRows),
      chartData: buildChartData(detailRows),
      summaryData: buildSummaryData(detailRows),
      displayColumns: ["状态", "项目", "姓名", "当前有效期", "已排日期", "说明"],
      detailColumns: ["状态", "项目", "员工号", "姓名", "当前有效期", "到期月份", "最晚完成日期", "已排日期", "是否录入", "来源", "说明"],
      allDetailRows: allRows,
      detailRows,
      skippedColumns: [],
      skippedRows: [],
      filterOptions: buildFilterOptions(allRows),
      stageStart: Utils.formatDate(assessment.stageStart),
      stageEnd: Utils.formatDate(assessment.stageEnd)
    };
  }

  function viewFromRows(baseResult, filters: AssessmentFilters = {}) {
    const allRows = baseResult.allDetailRows || baseResult.detailRows || [];
    const detailRows = filterRows(allRows, filters);
    const hasExplicitStatusFilter = normalizeFilterSet(filters.statuses).size > 0;
    return {
      ...baseResult,
      summaryText: hasExplicitStatusFilter
        ? `排班总览显示 ${detailRows.length} 条，原始扫描 ${allRows.length} 条。`
        : `排班总览默认显示 ${detailRows.length} 条待处理或异常记录，原始扫描 ${allRows.length} 条。`,
      statsCards: buildStatsCards(detailRows),
      chartData: buildChartData(detailRows),
      summaryData: buildSummaryData(detailRows),
      displayColumns: baseResult.displayColumns || ["状态", "项目", "姓名", "当前有效期", "已排日期", "说明"],
      detailRows,
      allDetailRows: allRows,
      filterOptions: baseResult.filterOptions || buildFilterOptions(allRows)
    };
  }

  window.SuperTraining.ScheduleAssessment = {
    STATUSES,
    DEFAULT_VISIBLE_STATUSES,
    buildRows,
    buildResult,
    filterRows,
    viewFromRows,
    buildStatsCards,
    buildChartData,
    buildSummaryData
  };
})();
