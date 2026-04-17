(function () {
  function makeBadgeCell(text, tone) {
    return {
      type: "badge",
      text,
      tone
    };
  }

  function badgeToneForUpdateJudgement(value) {
    switch (value) {
      case "命中窗口":
        return "warn";
      case "超期":
        return "danger";
      case "首次无旧值":
        return "info";
      case "提前窗口外":
      case "最新日期重算":
      default:
        return "info";
    }
  }

  function badgeToneForUpdateResult(value) {
    switch (value) {
      case "已更新":
        return "ok";
      case "不变":
        return "info";
      case "有效期回退":
      case "更新无效":
        return "danger";
      default:
        return "info";
    }
  }

  function badgeToneForSchedulePriority(value) {
    switch (value) {
      case "已过期":
      case "30天内到期":
        return "danger";
      case "60天内到期":
      case "命中窗口":
        return "warn";
      case "90天内到期":
      case "本阶段到期":
        return "info";
      default:
        return "ok";
    }
  }

  function badgeToneForScheduleStatus(value) {
    switch (value) {
      case "已过期":
        return "danger";
      case "命中窗口":
      case "本阶段到期":
        return "warn";
      case "有效未到窗口":
      case "阶段外未到期":
        return "ok";
      case "缺少旧有效期":
      default:
        return "info";
    }
  }

  function badgeToneForSkippedStatus(value) {
    switch (value) {
      case "日期异常":
      case "匹配失败":
        return "danger";
      case "有效期异常":
        return "danger";
      case "培训未录入":
      case "缺少旧有效期":
        return "info";
      case "有效未到窗口":
      case "阶段外未到期":
        return "ok";
      default:
        return "info";
    }
  }

  function badgeToneForPlanCheckStatus(value) {
    switch (value) {
      case "已排覆盖":
        return "ok";
      case "未覆盖":
        return "warn";
      default:
        return "info";
    }
  }

  function badgeToneForPlanCheckResult(value) {
    switch (value) {
      case "已标绿":
        return "ok";
      case "已补加":
        return "danger";
      default:
        return "info";
    }
  }

  window.SuperTraining.ResultStatus = {
    makeBadgeCell,
    badgeToneForUpdateJudgement,
    badgeToneForUpdateResult,
    badgeToneForSchedulePriority,
    badgeToneForScheduleStatus,
    badgeToneForSkippedStatus,
    badgeToneForPlanCheckStatus,
    badgeToneForPlanCheckResult
  };
})();
