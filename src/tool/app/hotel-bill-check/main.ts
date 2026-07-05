(function () {
    const runtime = window.HotelBillCheck || (window.HotelBillCheck = {});

    function doMatch(context: HotelBillContext): void {
        const billNameCol = Number.parseInt(context.getInput('billNameCol').value, 10);
        const billDateCol = Number.parseInt(context.getInput('billDateCol').value, 10);
        const checkinNameCol = Number.parseInt(context.getInput('checkinNameCol').value, 10);
        const checkinDateCol = Number.parseInt(context.getInput('checkinDateCol').value, 10);
        const tolerance = Number.parseInt(context.getInput('dateTolerance').value, 10);

        if (Number.isNaN(billNameCol) || Number.isNaN(billDateCol) || Number.isNaN(checkinNameCol) || Number.isNaN(checkinDateCol)) {
            alert('请选择所有必需的列');
            return;
        }

        const matchOutput = context.logic.matchRows({
            billData: context.state.billData,
            checkinData: context.state.checkinData,
            billNameCol,
            billDateCol,
            checkinNameCol,
            checkinDateCol,
            tolerance
        });

        context.state.matchResults = matchOutput.results;
        runtime.View.renderResults(context);
        context.getButton('exportBtn').disabled = false;
    }

    function bindEvents(context: HotelBillContext): void {
        context.getInput('billFile').addEventListener('change', event => runtime.FileActions.handleBillFile(context, event));
        context.getInput('checkinFile').addEventListener('change', event => runtime.FileActions.handleCheckinFile(context, event));
        context.getInput('billHeaderRow').addEventListener('change', () => runtime.FileActions.loadBillPreview(context));
        context.getInput('checkinHeaderRow').addEventListener('change', () => runtime.FileActions.loadCheckinPreview(context));
        context.getButton('matchBtn').addEventListener('click', () => doMatch(context));
        context.getButton('exportBtn').addEventListener('click', () => runtime.ExportActions.exportExcel(context));
    }

    document.addEventListener('DOMContentLoaded', function () {
        const context: HotelBillContext = runtime.AppContext.createAppContext();
        runtime.context = context;
        bindEvents(context);
    });
})();
