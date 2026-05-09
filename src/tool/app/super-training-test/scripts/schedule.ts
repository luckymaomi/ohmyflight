(function () {
  const Config = window.SuperTraining.Config;
  const Utils = window.SuperTraining.Utils;
  const ScheduleAssessment = window.SuperTraining.ScheduleAssessment;

  const SCHEDULE_STATUSES = new Set(["已过期", "必须排", "推荐排"]);

  function normalizeProjectNames(projectNames) {
    const names = Array.isArray(projectNames) ? projectNames : [projectNames];
    return [...new Set(names.map((name) => Utils.normalizeText(name)).filter(Boolean))];
  }

  function resolveSelectedProjects(analysis, projectNames) {
    const selectedNames = normalizeProjectNames(projectNames);
    if (!selectedNames.length) {
      throw new Error("请选择培训类型。");
    }

    return selectedNames.map((projectName) => {
      const project = analysis.projectMap.get(projectName);
      if (!project) {
        throw new Error(`未找到对应的培训类型：${projectName}`);
      }
      if (project.peopleColumnIndex < 0) {
        throw new Error(`人员信息表中缺少对应培训类型列：${projectName}`);
      }
      return project;
    });
  }

  function buildRemark(record, defaults) {
    const parts = [];
    const pendingRemark = Utils.normalizeText(defaults["备注"]);
    if (pendingRemark) parts.push(pendingRemark);
    parts.push(`预排原因：${record.status}`);
    if (record.priorityLabel) parts.push(`轻重缓急：${record.priorityLabel}`);
    parts.push(`原有效期：${record.oldExpiryText}`);
    if (record.pendingNote) parts.push(record.pendingNote);
    return parts.join("；");
  }

  function sortScheduleRecords(left, right) {
    if ((right.priorityRank || 0) !== (left.priorityRank || 0)) {
      return (right.priorityRank || 0) - (left.priorityRank || 0);
    }
    return left.oldExpiryText.localeCompare(right.oldExpiryText) || left.employeeId.localeCompare(right.employeeId);
  }

  function assignPendingContext(project, stageStart, stageEnd, records) {
    const startMonthKey = Utils.toMonthKey(stageStart);
    const endMonthKey = Utils.toMonthKey(stageEnd);
    const monthKey = startMonthKey && startMonthKey === endMonthKey ? startMonthKey : "";
    const sessions = monthKey ? (project.pendingSessionsByMonth.get(monthKey) || []) : [];
    const monthDefaults = monthKey ? (project.pendingDefaultsByMonth.get(monthKey) || {}) : {};
    const baseDefaults = { ...project.pendingGlobalDefaults, ...monthDefaults };
    const hasPendingRows = Boolean(project.pendingInfo && project.pendingInfo.rows.length);

    return records
      .sort(sortScheduleRecords)
      .map((record, index) => {
        const session = sessions.length ? sessions[index % sessions.length] : null;
        const pendingNote = session
          ? ""
          : (monthKey
            ? (hasPendingRows
              ? "该月份未找到可复用的未录入排班日期，已使用预排区间作为占位。"
              : "当前项目 sheet 中没有“培训信息是否录入!=是”的未录入行，已使用预排区间作为占位。")
            : "预排区间跨月，当前未按单月模板套用，已使用预排区间作为占位。");

        const trainingStart = session ? session.startDate : stageStart;
        const trainingEnd = session ? session.endDate : stageEnd;

        return {
          ...record,
          monthKey: monthKey || `${Utils.formatDate(stageStart)}~${Utils.formatDate(stageEnd)}`,
          trainingStart,
          trainingEnd,
          pendingDefaults: baseDefaults,
          pendingNote,
          remark: buildRemark(record, baseDefaults)
        };
      });
  }

  function mapPriority(row) {
    if (row.status === "已过期") {
      return { label: "已过期", rank: 50 };
    }
    if (row.status === "必须排") {
      return { label: "必须排", rank: 40 };
    }
    if (row.status === "推荐排") {
      return { label: "推荐排", rank: 20 };
    }
    return { label: "", rank: 0 };
  }

  function buildProjectScheduleRecords(project, assessmentRows, stageStart, stageEnd) {
    const detailRows = [];
    const skippedRows = [];
    const candidateRecords = [];
    let expiredCount = 0;
    let mustCount = 0;
    let recommendedCount = 0;
    let ignoredCount = 0;
    let missingExpiryCount = 0;

    assessmentRows.forEach((row) => {
      if (row.projectName !== project.canonical) return;

      if (row.status === "异常") {
        missingExpiryCount += 1;
        skippedRows.push({
          projectName: row.projectName,
          name: row.name,
          status: "异常",
          reason: row.reason
        });
        return;
      }

      if (!SCHEDULE_STATUSES.has(row.status)) {
        ignoredCount += 1;
        skippedRows.push({
          projectName: row.projectName,
          name: row.name,
          status: row.status,
          reason: row.reason
        });
        return;
      }

      if (row.status === "已过期") {
        expiredCount += 1;
      }
      if (row.status === "必须排") mustCount += 1;
      if (row.status === "推荐排") recommendedCount += 1;

      const priority = mapPriority(row);

      candidateRecords.push({
        projectName: row.projectName,
        employeeId: row.employeeId,
        name: row.name,
        status: row.status,
        priorityLabel: priority.label,
        priorityRank: priority.rank,
        reason: row.reason,
        oldExpiryText: row.expiry
      });
    });

    const finalRecords = assignPendingContext(project, stageStart, stageEnd, candidateRecords);
    finalRecords.forEach((record) => {
      detailRows.push({
        projectName: record.projectName,
        employeeId: record.employeeId,
        name: record.name,
        oldExpiry: record.oldExpiryText,
        priorityLabel: record.priorityLabel,
        status: record.status,
        startDate: Utils.formatDate(record.trainingStart),
        endDate: Utils.formatDate(record.trainingEnd),
        reason: record.reason + (record.pendingNote ? `；${record.pendingNote}` : "")
      });
    });

    const projectSheet = finalRecords.length
      ? {
        project,
        headers: (project.sheetInfo && project.sheetInfo.headers.length)
          ? [...project.sheetInfo.headers]
          : [...Config.DEFAULT_SCHEDULE_HEADERS],
        records: finalRecords
      }
      : null;

    return {
      checkedCount: assessmentRows.filter((row) => row.projectName === project.canonical).length,
      expiredCount,
      mustCount,
      recommendedCount,
      ignoredCount,
      missingExpiryCount,
      detailRows,
      skippedRows,
      projectSheet
    };
  }

  function buildSchedulePlan(analysis, projectNames, stageStart, stageEnd) {
    const selectedProjects = resolveSelectedProjects(analysis, projectNames);
    const assessment = ScheduleAssessment.buildResult(analysis, {
      today: stageStart,
      stageEnd,
      filters: {
        projects: selectedProjects.map((project) => project.canonical),
        statuses: ["已过期", "必须排", "推荐排", "已排未录入", "已录入待更新", "异常", "正常"]
      }
    });
    const assessmentRows = assessment.detailRows;
    const detailRows = [];
    const skippedRows = [];
    const projectSheets = [];
    let checkedCount = 0;
    let expiredCount = 0;
    let mustCount = 0;
    let recommendedCount = 0;
    let ignoredCount = 0;
    let missingExpiryCount = 0;

    selectedProjects.forEach((project) => {
      const result = buildProjectScheduleRecords(project, assessmentRows, stageStart, stageEnd);
      checkedCount += result.checkedCount;
      expiredCount += result.expiredCount;
      mustCount += result.mustCount;
      recommendedCount += result.recommendedCount;
      ignoredCount += result.ignoredCount;
      missingExpiryCount += result.missingExpiryCount;
      detailRows.push(...result.detailRows);
      skippedRows.push(...result.skippedRows);
      if (result.projectSheet) {
        projectSheets.push(result.projectSheet);
      }
    });

    const selectedProjectNames = selectedProjects.map((project) => project.canonical);
    const selectedProjectLabel = selectedProjectNames.join("、");
    const stageLabel = `${Utils.formatDate(stageStart)} 至 ${Utils.formatDate(stageEnd)}`;

    return {
      summaryText: `已按预排区间 ${stageLabel} 生成预排班预览：覆盖 ${selectedProjectNames.length} 个培训类型（${selectedProjectLabel}），预排 ${detailRows.length} 人次，其中已过期 ${expiredCount} 人次，必须排 ${mustCount} 人次，推荐排 ${recommendedCount} 人次。`,
      statsCards: [
        { label: "培训类型", value: selectedProjectNames.length },
        { label: "检查记录", value: checkedCount },
        { label: "预排人次", value: detailRows.length },
        { label: "已过期", value: expiredCount },
        { label: "必须排", value: mustCount },
        { label: "推荐排", value: recommendedCount },
        { label: "缺少旧有效期", value: missingExpiryCount },
        { label: "未命中", value: ignoredCount }
      ],
      detailColumns: ["项目", "员工号", "姓名", "原有效期", "轻重缓急", "状态", "开始日期", "结束日期", "说明"],
      detailRows,
      skippedColumns: ["项目", "姓名", "状态", "原因"],
      skippedRows,
      projectSheets
    };
  }

  window.SuperTraining.Schedule = {
    buildSchedulePlan
  };
})();
