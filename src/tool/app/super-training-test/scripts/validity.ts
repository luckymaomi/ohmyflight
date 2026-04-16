(function () {
  const Utils = window.SuperTraining.Utils;
  const RuleEngine = window.SuperTraining.RuleEngine;

  function resolvePeopleRow(recordedRow, recordedInfo, peopleInfo, peopleIndex) {
    const name = Utils.normalizeText(Utils.getValueByHeader(recordedRow, recordedInfo, "姓名"));
    const employeeId = Utils.normalizeText(Utils.getValueByHeader(recordedRow, recordedInfo, "员工号"));
    const nameMatches = name ? (peopleIndex.byName.get(name) || []) : [];

    if (nameMatches.length === 1) {
      const targetRow = peopleInfo.rows[nameMatches[0]];
      const targetEmployeeId = Utils.normalizeText(targetRow.cells[peopleIndex.employeeColumnIndex]);
      if (employeeId && targetEmployeeId && targetEmployeeId !== employeeId) {
        return {
          error: `姓名命中，但员工号不一致（人员信息表：${targetEmployeeId}）。`
        };
      }
      return {
        rowIndex: nameMatches[0],
        row: targetRow,
        matchedBy: "姓名"
      };
    }

    if (nameMatches.length > 1) {
      if (!employeeId) {
        return { error: "人员信息表中存在重名，且项目 sheet 的已录入记录缺少员工号，无法唯一定位。" };
      }
      const narrowed = nameMatches.filter((index) => {
        const targetRow = peopleInfo.rows[index];
        return Utils.normalizeText(targetRow.cells[peopleIndex.employeeColumnIndex]) === employeeId;
      });
      if (narrowed.length === 1) {
        return {
          rowIndex: narrowed[0],
          row: peopleInfo.rows[narrowed[0]],
          matchedBy: "姓名 + 员工号"
        };
      }
      return { error: "人员信息表中存在重名，员工号也无法唯一确认。" };
    }

    const idMatches = employeeId ? (peopleIndex.byId.get(employeeId) || []) : [];
    if (idMatches.length === 1) {
      return {
        rowIndex: idMatches[0],
        row: peopleInfo.rows[idMatches[0]],
        matchedBy: "员工号二次验证"
      };
    }
    if (idMatches.length > 1) {
      return { error: "员工号命中多行，无法唯一定位。" };
    }

    return { error: "未在人员信息表中找到对应人员。" };
  }

  function registerUpdatedRow(updatedRowMap, rowNumber, columnIndex, record) {
    const current = updatedRowMap.get(rowNumber) || {
      rowNumber,
      employeeId: record.employeeId,
      name: record.name,
      columns: new Set(),
      records: []
    };
    current.columns.add(columnIndex);
    current.records.push(record);
    updatedRowMap.set(rowNumber, current);
  }

  function normalizeProjectNames(projectNames) {
    const names = Array.isArray(projectNames) ? projectNames : [projectNames];
    return [...new Set(names.map((name) => Utils.normalizeText(name)).filter(Boolean))];
  }

  function resolveSelectedProjects(analysis, projectNames) {
    const selectedNames = normalizeProjectNames(projectNames);
    if (!selectedNames.length) {
      throw new Error("请先选择培训类型。");
    }

    return selectedNames.map((projectName) => {
      const project = analysis.projectMap.get(projectName);
      if (!project) {
        throw new Error(`未找到对应的培训类型：${projectName}`);
      }
      if (project.peopleColumnIndex < 0) {
        throw new Error(`人员信息表中缺少对应培训类型列：${projectName}`);
      }
      if (!project.recordedInfo || !project.recordedInfo.rows.length) {
        throw new Error(`项目 sheet 中没有“培训信息是否录入=是”的已录入记录：${projectName}`);
      }
      return project;
    });
  }

  function buildRowsToProcess(project, monthKey) {
    return project.recordedInfo.rows
      .map((row) => ({
        row,
        startDate: Utils.parseDate(Utils.getValueByHeader(row, project.recordedInfo, "培训开始日期")),
        endDate: Utils.parseDate(Utils.getValueByHeader(row, project.recordedInfo, "培训结束日期")),
        rowMonthKey: Utils.toMonthKey(Utils.getValueByHeader(row, project.recordedInfo, "培训开始日期"))
          || Utils.toMonthKey(Utils.getValueByHeader(row, project.recordedInfo, "培训结束日期"))
      }))
      .filter((item) => item.rowMonthKey === monthKey)
      .sort((left, right) => {
        const leftTime = left.startDate ? left.startDate.getTime() : 0;
        const rightTime = right.startDate ? right.startDate.getTime() : 0;
        return leftTime - rightTime || left.row.rowNumber - right.row.rowNumber;
      });
  }

  function buildSkippedRow(projectName, name, status, reason) {
    return {
      projectName,
      name,
      status,
      reason
    };
  }

  function buildValidityUpdate(workbook, analysis, projectNames, monthKey) {
    const peopleInfo = analysis.peopleInfo;
    const peopleSheet = workbook.Sheets[peopleInfo.name];
    const selectedProjects = resolveSelectedProjects(analysis, projectNames);
    const today = RuleEngine.createTodayDate();

    const detailRows = [];
    const skippedRows = [];
    const updatedRowMap = new Map();
    let matchedRecordedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let rollbackCount = 0;
    let invalidCount = 0;
    let skippedCount = 0;

    selectedProjects.forEach((project) => {
      const rowsToProcess = buildRowsToProcess(project, monthKey);

      rowsToProcess.forEach((item) => {
        matchedRecordedCount += 1;

        const row = item.row;
        const employeeId = Utils.normalizeText(Utils.getValueByHeader(row, project.recordedInfo, "员工号"));
        const name = Utils.normalizeText(Utils.getValueByHeader(row, project.recordedInfo, "姓名"));
        const infoEntered = Utils.normalizeText(
          Utils.getValueByHeader(row, project.recordedInfo, "培训信息是否录入")
        ) === "是";

        if (!infoEntered) {
          skippedRows.push(buildSkippedRow(project.canonical, name, "培训未录入", "培训信息是否录入不是“是”，本次跳过。"));
          skippedCount += 1;
          return;
        }

        if (!item.startDate) {
          skippedRows.push(buildSkippedRow(project.canonical, name, "日期异常", "培训开始日期无法解析。"));
          skippedCount += 1;
          return;
        }

        const target = resolvePeopleRow(row, project.recordedInfo, peopleInfo, analysis.peopleIndex);
        if (target.error) {
          skippedRows.push(buildSkippedRow(project.canonical, name, "匹配失败", target.error));
          skippedCount += 1;
          return;
        }

        const oldRaw = target.row.cells[project.peopleColumnIndex];
        const oldExpiry = Utils.parseDate(oldRaw);
        const oldExpiryText = Utils.formatDate(oldExpiry) || Utils.normalizeText(oldRaw) || "无";
        const computed = RuleEngine.computeExpiry(project.rule, item.startDate, oldExpiry);
        const judgement = RuleEngine.classifyUpdateJudgement(project.rule, item.startDate, oldExpiry);
        const outcome = RuleEngine.evaluateUpdateResult(oldExpiry, computed.newExpiry, today);
        const newExpiryText = Utils.formatDate(computed.newExpiry);
        const reasonParts = [
          `匹配方式：${target.matchedBy}`,
          computed.reason,
          outcome.reason
        ].filter(Boolean);

        detailRows.push({
          projectName: project.canonical,
          sheetName: project.sheetName,
          rowNumber: row.rowNumber,
          employeeId,
          name,
          oldExpiry: oldExpiryText,
          newExpiry: newExpiryText,
          judgement,
          result: outcome.result,
          reason: reasonParts.join("；")
        });

        if (outcome.result === "不变") {
          unchangedCount += 1;
          return;
        }

        if (outcome.result === "有效期回退") {
          rollbackCount += 1;
          return;
        }

        if (outcome.result === "更新无效") {
          invalidCount += 1;
          return;
        }

        Utils.writeDateCell(peopleSheet, target.row.rowNumber, project.peopleColumnIndex, computed.newExpiry);
        target.row.cells[project.peopleColumnIndex] = Utils.cloneDate(computed.newExpiry);
        updatedCount += 1;

        registerUpdatedRow(updatedRowMap, target.row.rowNumber, project.peopleColumnIndex, {
          projectName: project.canonical,
          sheetName: project.sheetName,
          rowNumber: row.rowNumber,
          employeeId,
          name,
          oldExpiry: oldExpiryText,
          newExpiry: newExpiryText,
          judgement,
          result: outcome.result,
          reason: reasonParts.join("；")
        });
      });
    });

    const selectedProjectNames = selectedProjects.map((project) => project.canonical);
    const selectedProjectLabel = selectedProjectNames.join("、");

    return {
      summaryText: `已按 ${monthKey} 已录入记录生成预览：覆盖 ${selectedProjectNames.length} 个培训类型（${selectedProjectLabel}），命中 ${matchedRecordedCount} 条，已更新 ${updatedCount} 条，不变 ${unchangedCount} 条，有效期回退 ${rollbackCount} 条，更新无效 ${invalidCount} 条，跳过 ${skippedCount} 条。`,
      statsCards: [
        { label: "培训类型", value: selectedProjectNames.length },
        { label: "命中已录入记录", value: matchedRecordedCount },
        { label: "已更新", value: updatedCount },
        { label: "不变", value: unchangedCount },
        { label: "有效期回退", value: rollbackCount },
        { label: "更新无效", value: invalidCount },
        { label: "跳过", value: skippedCount }
      ],
      detailColumns: ["项目", "项目 sheet", "项目行号", "员工号", "姓名", "旧有效期", "新有效期", "判断", "处理结果", "说明"],
      detailRows,
      skippedColumns: ["项目", "姓名", "状态", "原因"],
      skippedRows,
      updatedRowMap,
      updatedRecords: detailRows.filter((row) => row.result === "已更新")
    };
  }

  window.SuperTraining.Validity = {
    buildValidityUpdate
  };
})();
