(function () {
  const Utils = window.TrainingTool.Utils;

  let sequence = 1;
  let records: any[] = [];

  function normalizeRecord(input) {
    const projectName = Utils.normalizeProjectName(input.projectName);
    const employeeId = Utils.normalizeText(input.employeeId);
    const name = Utils.normalizeText(input.name);
    const trainingStartDate = Utils.formatDate(Utils.parseDate(input.trainingStartDate));
    const trainingEndDate = Utils.formatDate(Utils.parseDate(input.trainingEndDate || input.trainingStartDate));

    if (!projectName) throw new Error("请选择模拟排班项目。");
    if (!employeeId && !name) throw new Error("模拟排班人员缺少员工号和姓名。");
    if (!trainingStartDate) throw new Error("请选择可解析的模拟培训开始日期。");
    if (!trainingEndDate) throw new Error("请选择可解析的模拟培训结束日期。");
    if (Utils.parseDate(trainingStartDate) > Utils.parseDate(trainingEndDate)) {
      throw new Error("模拟培训开始日期不能晚于结束日期。");
    }

    const id = input.id || `simulation-${sequence++}`;
    return {
      id,
      projectName,
      employeeId,
      name,
      trainingStartDate,
      trainingEndDate,
      remark: Utils.normalizeText(input.remark) || "模拟排班",
      source: `模拟排班 ${id}`
    };
  }

  function add(record) {
    const normalized = normalizeRecord(record);
    records.push(normalized);
    return normalized;
  }

  function addMany(nextRecords) {
    return (nextRecords || []).map(add);
  }

  function remove(id) {
    const targetId = Utils.normalizeText(id);
    const before = records.length;
    records = records.filter((record) => record.id !== targetId);
    return before !== records.length;
  }

  function clear() {
    records = [];
  }

  function list() {
    return records.map((record) => ({ ...record }));
  }

  function toExtraProjectRows() {
    return list();
  }

  window.TrainingTool.SimulationSchedule = {
    add,
    addMany,
    remove,
    clear,
    list,
    toExtraProjectRows
  };
})();
