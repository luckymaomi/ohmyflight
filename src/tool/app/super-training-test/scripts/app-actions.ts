(function () {
  const Utils = window.SuperTraining.Utils;
  const Scanner = window.SuperTraining.Scanner;
  const Validity = window.SuperTraining.Validity;
  const Schedule = window.SuperTraining.Schedule;
  const PlanCheck = window.SuperTraining.PlanCheck;
  const ExpiryList = window.SuperTraining.ExpiryList;
  const ExpiryListExport = window.SuperTraining.ExpiryListExport;
  const WorkbenchExport = window.SuperTraining.WorkbenchExport;
  const ReportSheet = window.SuperTraining.ReportSheet;
  const GeneratedSheet = window.SuperTraining.GeneratedSheet;
  const runtime = window.SuperTrainingApp;
  const COPY = runtime.copy;
  const state = runtime.state;
  const elements = runtime.elements;
  const renderers = runtime.renderers;
  const controls = runtime.controls;
  const projects = runtime.projects;
  const workbenchController = runtime.workbenchController;

  async function handleWorkbookChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const file = target.files && target.files[0];
    if (!file) {
      state.sourceFileName = "";
      state.workbook = null;
      state.analysis = null;
      projects.renderEmptyState();
      controls.setStatus(COPY.defaultStatus);
      return;
    }

    controls.setBusy(true);
    controls.setStatus("正在读取总培训表并识别工作表...");

    try {
      const workbook = await Scanner.readWorkbookFile(file);
      const analysis = Scanner.analyzeWorkbook(workbook);

      state.sourceFileName = file.name;
      state.workbook = workbook;
      state.analysis = analysis;
      state.updateSelectedProjects = [];
      state.scheduleSelectedProjects = [];
      state.planCheckSelectedProjects = [];
      state.expiryListSelectedProjects = [];
      state.workbenchResult = null;
      state.workbenchView = null;
      state.workbenchSelection = null;
      elements.workbenchSearchInput.value = "";

      renderers.renderWorkbookOverview();
      renderers.renderValiditySheetOptions();
      projects.renderProjectGroups();
      projects.renderMonthSelect();
      renderers.renderWorkbenchFilterOptions(null);
      renderers.renderProjectCards();
      renderers.renderResultPlaceholders();
      controls.clearPendingExport();
      controls.refreshButtons();

      state.workbenchResult = workbenchController.buildCurrentWorkbenchResult(analysis);
      workbenchController.renderWorkbenchView();

      controls.setStatus(`识别完成：人员信息表“${analysis.peopleInfo.name}”，共识别 ${analysis.projects.length} 个项目 sheet，${analysis.availableMonths.length} 个可选月份。`);
    } catch (error) {
      state.sourceFileName = "";
      state.workbook = null;
      state.analysis = null;
      state.workbenchView = null;
      state.workbenchSelection = null;
      projects.renderEmptyState();
      controls.setStatus(error.message || "工作簿读取失败。", true);
    } finally {
      controls.setBusy(false);
    }
  }

  function validateUpdateSelection() {
    if (!state.analysis) {
      controls.setStatus("请先导入总培训表文件。", true);
      return null;
    }
    if (!elements.updateValiditySheetSelect.value) {
      controls.setStatus("请先确认人员信息表。", true);
      return null;
    }
    if (!state.updateSelectedProjects.length) {
      controls.setStatus("请先选择培训类型。", true);
      return null;
    }
    if (!elements.updateMonthSelect.value) {
      controls.setStatus("请先选择已录入月份。", true);
      return null;
    }
    return {
      projectNames: [...state.updateSelectedProjects],
      monthKey: elements.updateMonthSelect.value
    };
  }

  function validateScheduleRangeSelection() {
    if (!state.analysis) {
      controls.setStatus("请先导入总培训表文件。", true);
      return null;
    }
    if (!elements.scheduleValiditySheetSelect.value) {
      controls.setStatus("请先确认人员信息表。", true);
      return null;
    }
    if (!state.scheduleSelectedProjects.length) {
      controls.setStatus("请先选择培训类型。", true);
      return null;
    }

    const stageStart = Utils.parseDate(elements.scheduleStartDateInput.value);
    const stageEnd = Utils.parseDate(elements.scheduleEndDateInput.value);
    if (!stageStart) {
      controls.setStatus("请先选择预排开始日期。", true);
      return null;
    }
    if (!stageEnd) {
      controls.setStatus("请先选择预排结束日期。", true);
      return null;
    }
    if (stageStart > stageEnd) {
      controls.setStatus("预排开始日期不能晚于结束日期。", true);
      return null;
    }

    return {
      projectNames: [...state.scheduleSelectedProjects],
      stageStart,
      stageEnd
    };
  }

  function validatePlanCheckSelection() {
    if (!state.analysis) {
      controls.setStatus("请先导入总培训表文件。", true);
      return null;
    }
    if (!elements.planCheckValiditySheetSelect.value) {
      controls.setStatus("请先确认人员信息表。", true);
      return null;
    }
    if (!state.planCheckSelectedProjects.length) {
      controls.setStatus("请先选择培训类型。", true);
      return null;
    }
    if (!elements.planCheckMonthInput.value) {
      controls.setStatus("请先选择核对月份。", true);
      return null;
    }

    return {
      projectNames: [...state.planCheckSelectedProjects],
      monthKey: elements.planCheckMonthInput.value
    };
  }

  function validateExpiryListSelection() {
    if (!state.analysis) {
      controls.setStatus("请先导入总培训表文件。", true);
      return null;
    }
    if (!elements.expiryListValiditySheetSelect.value) {
      controls.setStatus("请先确认人员信息表。", true);
      return null;
    }
    if (!state.expiryListSelectedProjects.length) {
      controls.setStatus("请先选择培训类型。", true);
      return null;
    }
    if (!elements.expiryListStartMonthInput.value) {
      controls.setStatus("请选择开始月份。", true);
      return null;
    }
    if (!elements.expiryListEndMonthInput.value) {
      controls.setStatus("请选择结束月份。", true);
      return null;
    }

    return {
      projectNames: [...state.expiryListSelectedProjects],
      startMonthKey: elements.expiryListStartMonthInput.value,
      endMonthKey: elements.expiryListEndMonthInput.value
    };
  }

  async function handleUpdatePreview() {
    const selected = validateUpdateSelection();
    if (!selected) return;

    controls.setBusy(true);
    controls.clearPendingExport();
    controls.setStatus("正在生成有效期更新预览...");

    try {
      const workbook = Utils.deepClone(state.workbook) as SuperTrainingWorkbook;
      const analysis = Scanner.analyzeWorkbook(workbook);
      const result = Validity.buildValidityUpdate(workbook, analysis, selected.projectNames, selected.monthKey);

      ReportSheet.attachUpdateReportSheet(
        workbook,
        analysis,
        result,
        selected.projectNames,
        [selected.monthKey]
      );

      renderers.renderActionResult("validity", result);
      controls.setPendingExport(
        workbook,
        Utils.buildOutputFileName(state.sourceFileName, "更新有效期"),
        "有效期更新预览",
        "导出有效期更新结果 Excel"
      );
      controls.setStatus("有效期更新预览已生成，确认无误后可导出 Excel。");
    } catch (error) {
      controls.clearPendingExport();
      controls.setStatus(error.message || "生成有效期更新预览失败。", true);
    } finally {
      controls.setBusy(false);
    }
  }

  async function handleSchedulePreview() {
    const selected = validateScheduleRangeSelection();
    if (!selected) return;

    controls.setBusy(true);
    controls.clearPendingExport();
    controls.setStatus("正在生成预排班预览...");

    try {
      const workbook = Utils.deepClone(state.workbook) as SuperTrainingWorkbook;
      const analysis = Scanner.analyzeWorkbook(workbook);
      const result = Schedule.buildSchedulePlan(
        analysis,
        selected.projectNames,
        selected.stageStart,
        selected.stageEnd
      );

      renderers.renderActionResult("schedule", result);

      if (!result.projectSheets.length) {
        controls.setStatus("预排班预览已生成，但当前没有命中需要导出的预排结果。");
        return;
      }

      GeneratedSheet.attachGeneratedSheets(
        workbook,
        result,
        [`${Utils.formatDate(selected.stageStart)} ~ ${Utils.formatDate(selected.stageEnd)}`]
      );
      controls.setPendingExport(
        workbook,
        Utils.buildOutputFileName(state.sourceFileName, "生成预排班"),
        "预排班预览",
        "导出预排班结果 Excel"
      );
      controls.setStatus("预排班预览已生成，确认无误后可导出 Excel。");
    } catch (error) {
      controls.clearPendingExport();
      controls.setStatus(error.message || "生成预排班预览失败。", true);
    } finally {
      controls.setBusy(false);
    }
  }

  async function handlePlanCheckPreview() {
    const selected = validatePlanCheckSelection();
    if (!selected) return;

    controls.setBusy(true);
    controls.clearPendingExport();
    controls.setStatus("正在生成培训计划核对预览...");

    try {
      const workbook = Utils.deepClone(state.workbook) as SuperTrainingWorkbook;
      const analysis = Scanner.analyzeWorkbook(workbook);
      const result = PlanCheck.buildMonthlyPlanCheck(
        workbook,
        analysis,
        selected.projectNames,
        selected.monthKey
      );

      renderers.renderActionResult("planCheck", result);
      controls.setPendingExport(
        workbook,
        Utils.buildOutputFileName(state.sourceFileName, "培训计划核对"),
        "培训计划核对预览",
        "导出培训计划核对结果 Excel"
      );
      controls.setStatus("培训计划核对预览已生成，确认无误后可导出 Excel。");
    } catch (error) {
      controls.clearPendingExport();
      controls.setStatus(error.message || "生成培训计划核对预览失败。", true);
    } finally {
      controls.setBusy(false);
    }
  }

  async function handleExpiryListPreview() {
    const selected = validateExpiryListSelection();
    if (!selected) return;

    controls.setBusy(true);
    controls.clearPendingExport();
    controls.setStatus("正在查询到期清单...");

    try {
      const result = ExpiryList.buildExpiryList(
        state.analysis,
        selected.projectNames,
        selected.startMonthKey,
        selected.endMonthKey
      );

      renderers.renderActionResult("expiryList", result);
      controls.setPendingExport(
        ExpiryListExport.buildWorkbook(result),
        Utils.buildOutputFileName(state.sourceFileName, "到期清单"),
        "到期清单",
        "导出到期清单 Excel"
      );
      controls.setStatus("到期清单已生成，确认无误后可导出 Excel。");
    } catch (error) {
      controls.clearPendingExport();
      controls.setStatus(error.message || "查询到期清单失败。", true);
    } finally {
      controls.setBusy(false);
    }
  }

  async function handleWorkbenchPreview() {
    if (!state.analysis) {
      controls.setStatus("请先导入总培训表文件。", true);
      return;
    }

    controls.setBusy(true);
    controls.clearPendingExport();
    controls.setStatus("正在扫描排班总览...");

    try {
      state.workbenchResult = workbenchController.buildCurrentWorkbenchResult(state.analysis);
      workbenchController.renderWorkbenchView();
      controls.setStatus("排班总览扫描完成。");
    } catch (error) {
      controls.setStatus(error.message || "排班总览扫描失败。", true);
    } finally {
      controls.setBusy(false);
    }
  }

  function handleExport() {
    if (!state.pendingExport) {
      controls.setStatus("请先生成预览，再导出 Excel。", true);
      return;
    }

    try {
      window.XLSX.writeFile(state.pendingExport, state.pendingExportName);
      controls.setStatus(`${state.pendingExportLabel}已导出：${state.pendingExportName}`);
    } catch (error) {
      controls.setStatus(error.message || "导出 Excel 失败。", true);
    }
  }

  function writeWorkbook(workbook, fileName, successLabel) {
    window.XLSX.writeFile(workbook, fileName);
    controls.setStatus(`${successLabel}已导出：${fileName}`);
  }

  function handleExportWorkbenchView() {
    if (!state.workbenchView || !state.workbenchView.detailRows || !state.workbenchView.detailRows.length) {
      controls.setStatus("当前筛选总览没有可导出的人员。", true);
      return;
    }

    try {
      writeWorkbook(
        WorkbenchExport.buildWorkbook(state.workbenchView),
        Utils.buildOutputFileName(state.sourceFileName, "当前筛选总览"),
        "当前筛选总览"
      );
    } catch (error) {
      controls.setStatus(error.message || "导出当前筛选总览失败。", true);
    }
  }

  function handleExportWorkbenchSelection() {
    if (!state.workbenchSelection || !state.workbenchSelection.rows || !state.workbenchSelection.rows.length) {
      controls.setStatus("请先点击项目风险矩阵中的数字，再导出右侧人员明细。", true);
      return;
    }

    const { projectName, status } = state.workbenchSelection;
    try {
      writeWorkbook(
        WorkbenchExport.buildSelectionWorkbook(state.workbenchSelection),
        Utils.buildOutputFileName(state.sourceFileName, `${projectName}_${status}_人员明细`),
        "右侧人员明细"
      );
    } catch (error) {
      controls.setStatus(error.message || "导出右侧人员明细失败。", true);
    }
  }

  runtime.actions = {
    handleWorkbookChange,
    handleUpdatePreview,
    handleSchedulePreview,
    handlePlanCheckPreview,
    handleExpiryListPreview,
    handleWorkbenchPreview,
    handleExport,
    handleExportWorkbenchView,
    handleExportWorkbenchSelection
  };
})();
