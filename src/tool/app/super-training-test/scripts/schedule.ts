(function () {
  const Config = window.SuperTraining.Config;
  const Utils = window.SuperTraining.Utils;
  const RuleEngine = window.SuperTraining.RuleEngine;

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

  function buildProjectScheduleRecords(analysis, project, stageStart, stageEnd) {
    const detailRows = [];
    const skippedRows = [];
    const candidateRecords = [];
    let checkedCount = 0;
    let expiredCount = 0;
    let windowHitCount = 0;
    let stageDueCount = 0;
    let priority30Count = 0;
    let priority60Count = 0;
    let priority90Count = 0;
    let ignoredCount = 0;
    let missingExpiryCount = 0;

    analysis.peopleInfo.rows.forEach((row) => {
      const employeeId = Utils.normalizeText(row.cells[analysis.peopleIndex.employeeColumnIndex]);
      const name = Utils.normalizeText(row.cells[analysis.peopleIndex.nameColumnIndex]);
      if (!employeeId && !name) return;

      checkedCount += 1;

      const rawExpiry = row.cells[project.peopleColumnIndex];
      const oldExpiry = Utils.parseDate(rawExpiry);
      if (!oldExpiry) {
        if (Utils.normalizeText(rawExpiry) && !Utils.isNullLikeText(rawExpiry)) {
          missingExpiryCount += 1;
          skippedRows.push({
            projectName: project.canonical,
            name,
            status: "缺少旧有效期",
            reason: `当前有效期“${Utils.normalizeText(rawExpiry)}”无法解析为日期。`
          });
        }
        return;
      }

      const oldExpiryText = Utils.formatDate(oldExpiry);
      const classification = RuleEngine.classifyScheduleStageStatus(project.rule, stageStart, stageEnd, oldExpiry);

      if (!classification.include) {
        ignoredCount += 1;
        skippedRows.push({
          projectName: project.canonical,
          name,
          status: classification.status,
          reason: classification.reason
        });
        return;
      }

      const urgency = RuleEngine.classifyScheduleUrgency(
        project.rule,
        stageStart,
        stageEnd,
        oldExpiry,
        classification.status
      );

      if (urgency.label === "30天内到期") priority30Count += 1;
      if (urgency.label === "60天内到期") priority60Count += 1;
      if (urgency.label === "90天内到期") priority90Count += 1;

      if (classification.status === "已过期") {
        expiredCount += 1;
      } else if (classification.status === "命中窗口") {
        windowHitCount += 1;
      } else if (classification.status === "本阶段到期") {
        stageDueCount += 1;
      }

      candidateRecords.push({
        projectName: project.canonical,
        employeeId,
        name,
        status: classification.status,
        priorityLabel: urgency.label,
        priorityRank: urgency.rank,
        reason: classification.reason,
        oldExpiry,
        oldExpiryText
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
      checkedCount,
      expiredCount,
      windowHitCount,
      stageDueCount,
      priority30Count,
      priority60Count,
      priority90Count,
      ignoredCount,
      missingExpiryCount,
      detailRows,
      skippedRows,
      projectSheet
    };
  }

  function buildSchedulePlan(analysis, projectNames, stageStart, stageEnd) {
    const selectedProjects = resolveSelectedProjects(analysis, projectNames);
    const detailRows = [];
    const skippedRows = [];
    const projectSheets = [];
    let checkedCount = 0;
    let expiredCount = 0;
    let windowHitCount = 0;
    let stageDueCount = 0;
    let priority30Count = 0;
    let priority60Count = 0;
    let priority90Count = 0;
    let ignoredCount = 0;
    let missingExpiryCount = 0;

    selectedProjects.forEach((project) => {
      const result = buildProjectScheduleRecords(analysis, project, stageStart, stageEnd);
      checkedCount += result.checkedCount;
      expiredCount += result.expiredCount;
      windowHitCount += result.windowHitCount;
      stageDueCount += result.stageDueCount;
      priority30Count += result.priority30Count;
      priority60Count += result.priority60Count;
      priority90Count += result.priority90Count;
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
      summaryText: `已按预排区间 ${stageLabel} 生成预排班预览：覆盖 ${selectedProjectNames.length} 个培训类型（${selectedProjectLabel}），预排 ${detailRows.length} 人次，其中已过期 ${expiredCount} 人次，30天内 ${priority30Count} 人次，60天内 ${priority60Count} 人次，90天内 ${priority90Count} 人次。`,
      statsCards: [
        { label: "培训类型", value: selectedProjectNames.length },
        { label: "检查记录", value: checkedCount },
        { label: "预排人次", value: detailRows.length },
        { label: "已过期", value: expiredCount },
        { label: "30天内到期", value: priority30Count },
        { label: "60天内到期", value: priority60Count },
        { label: "90天内到期", value: priority90Count },
        { label: "命中窗口", value: windowHitCount },
        { label: "本阶段到期", value: stageDueCount },
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
