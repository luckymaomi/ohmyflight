(function () {
  const Utils = window.SuperTraining.Utils;
  const RuleEngine = window.SuperTraining.RuleEngine;

  const COVERED_NAME_STYLE = {
    font: { bold: true, color: { rgb: "1F6F43" } },
    fill: { patternType: "solid", fgColor: { rgb: "D9F2D9" } }
  };

  const MISSING_NAME_STYLE = {
    font: { bold: true, color: { rgb: "C62828" } },
    fill: { patternType: "solid", fgColor: { rgb: "FDE2E1" } }
  };

  function normalizeProjectNames(projectNames) {
    const names = Array.isArray(projectNames) ? projectNames : [projectNames];
    return [...new Set(names.map((name) => Utils.normalizeText(name)).filter(Boolean))];
  }

  function resolveSelectedProjects(analysis, projectNames) {
    const selectedNames = normalizeProjectNames(projectNames);
    if (!selectedNames.length) {
      throw new Error("请选择要核对的培训类型。");
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

  function readCellStyle(sheet, rowNumber, columnIndex) {
    if (!sheet || rowNumber <= 0 || columnIndex < 0) return {};
    const address = window.XLSX.utils.encode_cell({ r: rowNumber - 1, c: columnIndex });
    return Utils.cloneStyle(sheet[address] && sheet[address].s);
  }

  function mergeCellStyle(sheet, rowNumber, columnIndex, patchStyle) {
    if (!sheet || rowNumber <= 0 || columnIndex < 0) return;
    const address = window.XLSX.utils.encode_cell({ r: rowNumber - 1, c: columnIndex });
    if (!sheet[address]) {
      sheet[address] = { t: "s", v: "" };
    }
    sheet[address].s = Utils.mergeStyle(sheet[address].s, patchStyle);
    Utils.expandSheetRef(sheet, rowNumber - 1, columnIndex);
  }

  function getRowTrainingDate(row, sheetInfo) {
    return Utils.parseDate(Utils.getValueByHeader(row, sheetInfo, "培训开始日期"))
      || Utils.parseDate(Utils.getValueByHeader(row, sheetInfo, "培训结束日期"));
  }

  function isRecordedRow(row, sheetInfo) {
    return Utils.normalizeText(Utils.getValueByHeader(row, sheetInfo, "培训信息是否录入")) === "是";
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

  function buildDueCandidates(analysis, project, monthKey) {
    const candidates = [];
    const skippedRows = [];

    analysis.peopleInfo.rows.forEach((row) => {
      const employeeId = Utils.normalizeText(row.cells[analysis.peopleIndex.employeeColumnIndex]);
      const name = Utils.normalizeText(row.cells[analysis.peopleIndex.nameColumnIndex]);
      if (!employeeId && !name) return;

      const rawExpiry = row.cells[project.peopleColumnIndex];
      const expiry = Utils.parseDate(rawExpiry);
      const expiryText = Utils.formatDate(expiry) || Utils.normalizeText(rawExpiry);

      if (!expiry) {
        if (Utils.normalizeText(rawExpiry) && !Utils.isNullLikeText(rawExpiry)) {
          skippedRows.push({
            projectName: project.canonical,
            name,
            status: "有效期异常",
            reason: `当前有效期“${Utils.normalizeText(rawExpiry)}”无法解析为日期。`
          });
        }
        return;
      }

      if (Utils.toMonthKey(expiry) !== monthKey) {
        return;
      }

      candidates.push({
        employeeId,
        name,
        expiry,
        expiryText
      });
    });

    return { candidates, skippedRows };
  }

  function buildInsertReason(project, hasExpiryColumn) {
    if (hasExpiryColumn) {
      return `原项目 sheet 中未找到可覆盖本轮到期的安排，已直接补加到 ${project.sheetName}，并写入姓名与有效期。`;
    }
    return `原项目 sheet 中未找到可覆盖本轮到期的安排，已直接补加到 ${project.sheetName}，但该表缺少“有效期”列，本次仅写入姓名。`;
  }

  function sortMatchedRows(left, right) {
    const leftTime = left.trainingDate ? left.trainingDate.getTime() : Number.POSITIVE_INFINITY;
    const rightTime = right.trainingDate ? right.trainingDate.getTime() : Number.POSITIVE_INFINITY;
    return leftTime - rightTime || left.row.rowNumber - right.row.rowNumber;
  }

  function buildCandidateMatches(project, candidate) {
    return project.sheetInfo.rows
      .filter((row) => samePerson(candidate, row, project.sheetInfo))
      .map((row) => {
        const trainingDate = getRowTrainingDate(row, project.sheetInfo);
        return {
          row,
          trainingDate,
          trainingDateText: Utils.formatDate(trainingDate),
          infoEntered: isRecordedRow(row, project.sheetInfo),
          coverage: RuleEngine.evaluatePlanCoverage(project.rule, trainingDate, candidate.expiry)
        };
      })
      .sort(sortMatchedRows);
  }

  function buildCoveredReason(matches) {
    const sortedMatches = [...matches].sort(sortMatchedRows);
    const earliestMatch = sortedMatches[0];
    const recordedCount = sortedMatches.filter((item) => item.infoEntered).length;
    const baseReason = recordedCount
      ? `项目 sheet 已找到 ${sortedMatches.length} 条可覆盖本轮到期的记录（最早安排：${earliestMatch.trainingDateText || "未填写日期"}），其中已录入 ${recordedCount} 条，姓名已标绿。`
      : `项目 sheet 已找到 ${sortedMatches.length} 条可覆盖本轮到期的记录（最早安排：${earliestMatch.trainingDateText || "未填写日期"}），但未发现已录入信息，姓名已标绿。`;
    return `${baseReason}${earliestMatch.coverage.reason ? ` ${earliestMatch.coverage.reason}` : ""}`;
  }

  function buildUncoveredReason(project, hasExpiryColumn, matches) {
    const writeReason = buildInsertReason(project, hasExpiryColumn);
    if (!matches.length) {
      return writeReason;
    }

    const recordedCount = matches.filter((item) => item.infoEntered).length;
    const coverageFailure = matches.find((item) => item.coverage && item.coverage.reason);
    const matchReason = recordedCount
      ? `项目 sheet 已找到 ${matches.length} 条同人记录，但都不能覆盖本轮到期。`
      : `项目 sheet 已找到 ${matches.length} 条同人记录，但都不能覆盖本轮到期，且未发现已录入信息。`;
    return `${matchReason}${coverageFailure ? ` ${coverageFailure.coverage.reason}` : ""} ${writeReason}`;
  }

  function appendMissingRow(project, candidate) {
    const sheet = project.sheetInfo.sheet;
    const bounds = Utils.getSheetBounds(sheet);
    const newRowNumber = bounds.endRow + 2;
    const nameColumnIndex = Utils.findHeaderIndex(project.sheetInfo, "姓名");
    const expiryColumnIndex = Utils.findHeaderIndex(project.sheetInfo, "有效期");
    const sampleRowNumber = (project.pendingInfo && project.pendingInfo.sampleRowNumber)
      || (project.sheetInfo.rows.length ? project.sheetInfo.rows[project.sheetInfo.rows.length - 1].rowNumber : 2);

    const nameStyle = Utils.mergeStyle(
      readCellStyle(sheet, sampleRowNumber, nameColumnIndex),
      MISSING_NAME_STYLE
    );

    Utils.writeCell(sheet, newRowNumber, nameColumnIndex, candidate.name, nameStyle);

    if (expiryColumnIndex >= 0) {
      Utils.writeDateCell(sheet, newRowNumber, expiryColumnIndex, candidate.expiry);
      const expiryAddress = window.XLSX.utils.encode_cell({ r: newRowNumber - 1, c: expiryColumnIndex });
      if (sheet[expiryAddress]) {
        sheet[expiryAddress].s = Utils.mergeStyle(
          readCellStyle(sheet, sampleRowNumber, expiryColumnIndex),
          sheet[expiryAddress].s
        );
      }
    }

    return {
      rowNumber: newRowNumber,
      hasExpiryColumn: expiryColumnIndex >= 0
    };
  }

  function markCoveredRows(project, rows) {
    const nameColumnIndex = Utils.findHeaderIndex(project.sheetInfo, "姓名");
    rows.forEach((row) => {
      mergeCellStyle(project.sheetInfo.sheet, row.rowNumber, nameColumnIndex, COVERED_NAME_STYLE);
    });
  }

  function buildProjectPlanCheck(workbook, analysis, project, monthKey) {
    const detailRows = [];
    const { candidates, skippedRows } = buildDueCandidates(analysis, project, monthKey);
    let coveredCount = 0;
    let insertedCount = 0;

    candidates.forEach((candidate) => {
      const matches = buildCandidateMatches(project, candidate);
      const coveredMatches = matches.filter((item) => item.coverage.covered);

      if (coveredMatches.length) {
        markCoveredRows(project, coveredMatches.map((item) => item.row));
        coveredCount += 1;
        detailRows.push({
          projectName: project.canonical,
          employeeId: candidate.employeeId,
          name: candidate.name,
          expiry: candidate.expiryText,
          status: "已排覆盖",
          result: "已标绿",
          reason: buildCoveredReason(coveredMatches)
        });
        return;
      }

      const inserted = appendMissingRow(project, candidate);
      insertedCount += 1;
      detailRows.push({
        projectName: project.canonical,
        employeeId: candidate.employeeId,
        name: candidate.name,
        expiry: candidate.expiryText,
        status: "未覆盖",
        result: "已补加",
        reason: `${buildUncoveredReason(project, inserted.hasExpiryColumn, matches)}（新增行号：${inserted.rowNumber}）`
      });
    });

    return {
      dueCount: candidates.length,
      coveredCount,
      insertedCount,
      detailRows,
      skippedRows
    };
  }

  function buildMonthlyPlanCheck(workbook, analysis, projectNames, monthKey) {
    const selectedProjects = resolveSelectedProjects(analysis, projectNames);
    const detailRows = [];
    const skippedRows = [];
    let dueCount = 0;
    let coveredCount = 0;
    let insertedCount = 0;

    selectedProjects.forEach((project) => {
      const result = buildProjectPlanCheck(workbook, analysis, project, monthKey);
      dueCount += result.dueCount;
      coveredCount += result.coveredCount;
      insertedCount += result.insertedCount;
      detailRows.push(...result.detailRows);
      skippedRows.push(...result.skippedRows);
    });

    detailRows.sort((left, right) => {
      return left.projectName.localeCompare(right.projectName)
        || left.expiry.localeCompare(right.expiry)
        || left.name.localeCompare(right.name);
    });

    skippedRows.sort((left, right) => {
      return left.projectName.localeCompare(right.projectName)
        || left.name.localeCompare(right.name);
    });

    const selectedProjectNames = selectedProjects.map((project) => project.canonical);
    return {
      summaryText: `已按 ${monthKey} 完成培训计划核对：覆盖 ${selectedProjectNames.length} 个培训类型，筛出当月到期 ${dueCount} 人，其中已排 ${coveredCount} 人，补加 ${insertedCount} 人，异常 ${skippedRows.length} 条。`,
      statsCards: [
        { label: "培训类型", value: selectedProjectNames.length },
        { label: "当月到期", value: dueCount },
        { label: "已排", value: coveredCount },
        { label: "已补加", value: insertedCount },
        { label: "异常", value: skippedRows.length }
      ],
      detailColumns: ["项目", "员工号", "姓名", "有效期", "状态", "处理结果", "说明"],
      detailRows,
      skippedColumns: ["项目", "姓名", "状态", "原因"],
      skippedRows
    };
  }

  window.SuperTraining.PlanCheck = {
    buildMonthlyPlanCheck
  };
})();
