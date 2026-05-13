(function () {
  const Utils = window.TrainingTool.Utils;

  const HEADERS = {
    infoEntered: "培训信息是否录入",
    remark: "备注"
  };

  const VALUES = {
    recorded: "是",
    cancelKeyword: "取消"
  };

  function getInfoEnteredText(row, sheetInfo) {
    return Utils.normalizeText(Utils.getValueByHeader(row, sheetInfo, HEADERS.infoEntered));
  }

  function getRemarkText(row, sheetInfo) {
    return Utils.normalizeText(Utils.getValueByHeader(row, sheetInfo, HEADERS.remark));
  }

  function isRecorded(row, sheetInfo) {
    return getInfoEnteredText(row, sheetInfo) === VALUES.recorded;
  }

  function isCancelled(row, sheetInfo) {
    return getRemarkText(row, sheetInfo).includes(VALUES.cancelKeyword);
  }

  function classify(row, sheetInfo) {
    const recorded = isRecorded(row, sheetInfo);
    const cancelled = isCancelled(row, sheetInfo);

    if (recorded && cancelled) {
      return {
        recorded,
        cancelled,
        active: false,
        abnormal: true,
        status: "已录入但备注取消",
        reason: "培训信息是否录入为“是”，但备注包含“取消”，数据矛盾，需人工确认。"
      };
    }

    if (cancelled) {
      return {
        recorded,
        cancelled,
        active: false,
        abnormal: false,
        status: "已取消",
        reason: "备注包含“取消”，这条计划记录不参与覆盖判断。"
      };
    }

    return {
      recorded,
      cancelled,
      active: true,
      abnormal: false,
      status: recorded ? "已录入" : "未录入",
      reason: ""
    };
  }

  window.TrainingTool.TrainingRecordPolicy = {
    getInfoEnteredText,
    getRemarkText,
    isRecorded,
    isCancelled,
    classify
  };
})();
