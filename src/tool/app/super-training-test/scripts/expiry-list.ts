(function () {
  const Utils = window.SuperTraining.Utils;
  const TrainingIgnoreList = window.SuperTraining.TrainingIgnoreList;

  function normalizeProjectNames(projectNames) {
    const names = Array.isArray(projectNames) ? projectNames : [projectNames];
    return [...new Set(names.map((name) => Utils.normalizeText(name)).filter(Boolean))];
  }

  function resolveSelectedProjects(analysis, projectNames) {
    const selectedNames = normalizeProjectNames(projectNames);
    if (!selectedNames.length) {
      throw new Error("请选择要查询的培训类型。");
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

  function resolveMonthRange(startMonthKey, endMonthKey) {
    const startRange = Utils.monthRangeFromKey(startMonthKey);
    const endRange = Utils.monthRangeFromKey(endMonthKey);

    if (!startRange) {
      throw new Error("请选择有效的开始月份。");
    }
    if (!endRange) {
      throw new Error("请选择有效的结束月份。");
    }
    if (startRange.start > endRange.end) {
      throw new Error("开始月份不能晚于结束月份。");
    }

    return {
      start: startRange.start,
      end: endRange.end,
      label: startMonthKey === endMonthKey ? startMonthKey : `${startMonthKey} 至 ${endMonthKey}`
    };
  }

  function isInRange(date, range) {
    return date >= range.start && date <= range.end;
  }

  function buildExpiryList(analysis, projectNames, startMonthKey, endMonthKey) {
    const selectedProjects = resolveSelectedProjects(analysis, projectNames);
    const range = resolveMonthRange(startMonthKey, endMonthKey);
    const detailRows = [];
    const skippedRows = [];

    selectedProjects.forEach((project) => {
      analysis.peopleInfo.rows.forEach((row) => {
        const employeeId = Utils.normalizeText(row.cells[analysis.peopleIndex.employeeColumnIndex]);
        const name = Utils.normalizeText(row.cells[analysis.peopleIndex.nameColumnIndex]);
        if (!employeeId && !name) return;
        if (TrainingIgnoreList.shouldIgnore({ employeeId, name }, project.canonical)) return;

        const rawExpiry = row.cells[project.peopleColumnIndex];
        const expiry = Utils.parseDate(rawExpiry);
        const rawExpiryText = Utils.normalizeText(rawExpiry);

        if (!expiry) {
          if (rawExpiryText && !Utils.isNullLikeText(rawExpiryText)) {
            skippedRows.push({
              projectName: project.canonical,
              employeeId,
              name,
              status: "有效期异常",
              source: `${analysis.peopleInfo.name} 第${row.rowNumber}行`,
              reason: `当前有效期“${rawExpiryText}”无法解析为日期。`
            });
          }
          return;
        }

        if (!isInRange(expiry, range)) {
          return;
        }

        detailRows.push({
          projectName: project.canonical,
          employeeId,
          name,
          expiry: Utils.formatDate(expiry),
          dueMonth: Utils.toMonthKey(expiry),
          source: `${analysis.peopleInfo.name} 第${row.rowNumber}行`
        });
      });
    });

    detailRows.sort((left, right) => {
      return left.dueMonth.localeCompare(right.dueMonth)
        || left.expiry.localeCompare(right.expiry)
        || left.projectName.localeCompare(right.projectName)
        || left.name.localeCompare(right.name);
    });

    skippedRows.sort((left, right) => {
      return left.projectName.localeCompare(right.projectName)
        || left.name.localeCompare(right.name);
    });

    const selectedProjectNames = selectedProjects.map((project) => project.canonical);
    return {
      summaryText: `已按 ${range.label} 查询有效期到期清单：覆盖 ${selectedProjectNames.length} 个培训类型，命中 ${detailRows.length} 人次，异常 ${skippedRows.length} 条。`,
      statsCards: [
        { label: "培训类型", value: selectedProjectNames.length },
        { label: "到期人次", value: detailRows.length },
        { label: "异常", value: skippedRows.length }
      ],
      detailColumns: ["项目", "员工号", "姓名", "有效期", "到期月份", "来源"],
      detailRows,
      skippedColumns: ["项目", "员工号", "姓名", "状态", "来源", "原因"],
      skippedRows
    };
  }

  window.SuperTraining.ExpiryList = {
    buildExpiryList
  };
})();
