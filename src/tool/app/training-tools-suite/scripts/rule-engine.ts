(function () {
  const tools = window.TrainingTools;

  function sameDay(left, right) {
    if (!left || !right) return false;
    return tools.formatDate(left) === tools.formatDate(right);
  }

  function isEarlierDay(left, right) {
    if (!left || !right) return false;
    return left.getTime() < right.getTime() && !sameDay(left, right);
  }

  function resolveDueDate(oldExpiry, windowInfo) {
    if (windowInfo && windowInfo.hasWindow && windowInfo.windowEnd) {
      return windowInfo.windowEnd;
    }
    return oldExpiry;
  }

  function createTodayDate() {
    const now = new Date();
    return tools.makeDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  function classifyUpdateJudgement(rule, trainingDate, oldExpiry) {
    if (!oldExpiry) return "首次无旧值";

    const ruleType = tools.normalizeText(rule.ruleType);
    if (ruleType === "最新日期") {
      return trainingDate > oldExpiry ? "超期" : "最新日期重算";
    }

    const windowInfo = tools.getWindowInfo(rule, oldExpiry);
    if (windowInfo.hasWindow && trainingDate >= windowInfo.windowStart && trainingDate <= windowInfo.windowEnd) {
      return "命中窗口";
    }
    if (windowInfo.hasWindow && trainingDate > windowInfo.windowEnd) {
      return "超期";
    }
    return "提前窗口外";
  }

  function evaluateUpdateResult(oldExpiry, newExpiry, currentDate) {
    const today = currentDate || createTodayDate();

    if (newExpiry && isEarlierDay(newExpiry, today)) {
      if (oldExpiry && isEarlierDay(newExpiry, oldExpiry)) {
        return {
          result: "更新无效",
          shouldWrite: false,
          reason: "新有效期早于今天，且比当前有效期更早，本次不回写。"
        };
      }
      return {
        result: "更新无效",
        shouldWrite: false,
        reason: "新有效期早于今天，本次不回写。"
      };
    }

    if (oldExpiry && isEarlierDay(newExpiry, oldExpiry)) {
      return {
        result: "有效期回退",
        shouldWrite: false,
        reason: "新有效期早于当前有效期，本次不回写。"
      };
    }

    if (oldExpiry && sameDay(oldExpiry, newExpiry)) {
      return {
        result: "不变",
        shouldWrite: false,
        reason: "新旧有效期一致，无需回写。"
      };
    }

    return {
      result: "已更新",
      shouldWrite: true,
      reason: oldExpiry
        ? "新有效期晚于当前有效期，允许回写。"
        : "首次生成有效期，允许回写。"
    };
  }

  function describeStageOutsideWindow(stageStart, stageEnd, oldExpiry, windowInfo) {
    if (!windowInfo.hasWindow) {
      return `项目无窗口期，当前有效期为 ${tools.formatDate(oldExpiry)}，未落在预排区间 ${tools.formatDate(stageStart)} 至 ${tools.formatDate(stageEnd)} 内。`;
    }
    if (stageEnd < windowInfo.windowStart) {
      return `到预排区间结束时仍未进入${windowInfo.tag}，窗口开始于 ${tools.formatDate(windowInfo.windowStart)}。`;
    }
    return `预排区间未命中${windowInfo.tag}，窗口为 ${tools.formatDate(windowInfo.windowStart)} 至 ${tools.formatDate(windowInfo.windowEnd)}。`;
  }

  function classifyScheduleUrgency(rule, stageStart, stageEnd, oldExpiry, status) {
    if (!oldExpiry) {
      return {
        label: "",
        rank: 0
      };
    }

    const windowInfo = tools.getWindowInfo(rule, oldExpiry);
    const dueDate = resolveDueDate(oldExpiry, windowInfo);

    if (dueDate < stageStart || status === "已过期") {
      return {
        label: "已过期",
        rank: 50
      };
    }

    if (tools.isThreeMonthWindowRule(rule)) {
      const daysToExpiry = tools.daysBetween(dueDate, stageEnd);
      if (daysToExpiry <= 30) {
        return {
          label: "30天内到期",
          rank: 40
        };
      }
      if (daysToExpiry <= 60) {
        return {
          label: "60天内到期",
          rank: 30
        };
      }
      if (daysToExpiry <= 90) {
        return {
          label: "90天内到期",
          rank: 20
        };
      }
    }

    if (status === "本阶段到期") {
      return {
        label: "本阶段到期",
        rank: 15
      };
    }

    if (status === "命中窗口") {
      return {
        label: "命中窗口",
        rank: 10
      };
    }

    return {
      label: "",
      rank: 0
    };
  }

  function classifyScheduleStageStatus(rule, stageStart, stageEnd, oldExpiry) {
    if (!oldExpiry) {
      return {
        status: "缺少旧有效期",
        include: false,
        windowInfo: tools.getWindowInfo(rule, oldExpiry),
        reason: "这一行没有可解析的旧有效期，暂时无法判断是否需要预排。"
      };
    }

    const windowInfo = tools.getWindowInfo(rule, oldExpiry);
    const dueDate = resolveDueDate(oldExpiry, windowInfo);
    if (dueDate < stageStart) {
      return {
        status: "已过期",
        include: true,
        windowInfo,
        reason: `预排开始日期 ${tools.formatDate(stageStart)} 已晚于本轮必须完成日期 ${tools.formatDate(dueDate)}，该人员已过期，需要优先处理。`
      };
    }

    if (windowInfo.hasWindow && tools.rangesOverlap(stageStart, stageEnd, windowInfo.windowStart, windowInfo.windowEnd)) {
      return {
        status: "命中窗口",
        include: true,
        windowInfo,
        reason: `预排区间 ${tools.formatDate(stageStart)} 至 ${tools.formatDate(stageEnd)} 与${windowInfo.tag}重叠，需要进入预排。`
      };
    }

    if (!windowInfo.hasWindow && oldExpiry >= stageStart && oldExpiry <= stageEnd) {
      return {
        status: "本阶段到期",
        include: true,
        windowInfo,
        reason: `项目无窗口期，但旧有效期 ${tools.formatDate(oldExpiry)} 落在预排区间 ${tools.formatDate(stageStart)} 至 ${tools.formatDate(stageEnd)} 内，需要在本阶段安排。`
      };
    }

    return {
      status: windowInfo.hasWindow ? "有效未到窗口" : "阶段外未到期",
      include: false,
      windowInfo,
      reason: describeStageOutsideWindow(stageStart, stageEnd, oldExpiry, windowInfo)
    };
  }

  Object.assign(window.TrainingTools, {
    classifyScheduleStageStatus,
    classifyScheduleUrgency,
    classifyUpdateJudgement,
    createTodayDate,
    evaluateUpdateResult
  });
})();
