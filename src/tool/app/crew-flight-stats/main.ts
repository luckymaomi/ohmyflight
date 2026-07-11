(function () {
    const runtime = window.CrewFlightStatsApp || (window.CrewFlightStatsApp = {});

    function bindSheetActions(context: CrewFlightStatsContext): void {
        context.elements.selectAllBtn.addEventListener('click', function () {
            context.elements.sheetSelector.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = true;
                checkbox.parentElement?.classList.add('checked');
            });
            context.state.selectedSheets = context.state.scheduleWorkbook ? [...context.state.scheduleWorkbook.SheetNames] : [];
            context.checkReady();
        });

        context.elements.selectNoneBtn.addEventListener('click', function () {
            context.elements.sheetSelector.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = false;
                checkbox.parentElement?.classList.remove('checked');
            });
            context.state.selectedSheets = [];
            context.checkReady();
        });
    }

    function analyze(context: CrewFlightStatsContext): void {
        if (!context.state.scheduleWorkbook || context.state.rosterNames.length === 0 || context.state.selectedSheets.length === 0) return;

        const sheetRows = context.state.selectedSheets.flatMap(sheetName => {
            const sheet = context.state.scheduleWorkbook?.Sheets[sheetName];
            return sheet ? [{
                sheetName,
                rows: context.XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
            }] : [];
        });
        const analyzeResult = context.logic.analyzeScheduleRows(sheetRows, context.state.rosterNames);
        context.state.statsResult = analyzeResult.statsResult;
        context.state.routes = analyzeResult.routes;
        runtime.View.renderWarnings(context, analyzeResult.unmatchedCells);
        runtime.View.displayResult(context);
        context.elements.exportBtn.disabled = false;
    }

    function exportExcel(context: CrewFlightStatsContext): void {
        if (!context.state.statsResult || context.state.routes.length === 0) return;
        const data = context.logic.buildCrewFlightExportRows(context.state.statsResult, context.state.routes, context.state.rosterNames);
        const worksheet = context.XLSX.utils.aoa_to_sheet(data);
        const workbook = context.XLSX.utils.book_new();
        context.XLSX.utils.book_append_sheet(workbook, worksheet, '航线班次统计');
        context.XLSX.writeFile(workbook, '航线班次统计.xlsx');
    }

    function init(): void {
        const context: CrewFlightStatsContext = runtime.AppContext.createAppContext();
        runtime.context = context;
        runtime.FileActions.bindFileActions(context);
        bindSheetActions(context);
        runtime.CrewExtractActions.bindCrewExtractActions(context);
        context.elements.analyzeBtn.addEventListener('click', () => analyze(context));
        context.elements.exportBtn.addEventListener('click', () => exportExcel(context));
    }

    document.addEventListener('DOMContentLoaded', init);
})();
