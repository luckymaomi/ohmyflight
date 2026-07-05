(function () {
    const runtime = window.HotelBillCheck || (window.HotelBillCheck = {});

    function createState(): HotelBillState {
        return {
            billWorkbook: null,
            checkinWorkbook: null,
            billData: [],
            checkinData: [],
            billColumns: [],
            checkinColumns: [],
            billHyperlinks: {},
            checkinHyperlinks: {},
            matchResults: []
        };
    }

    function createAppContext(): HotelBillContext {
        return {
            runtime,
            XLSX: window.XLSX,
            logic: window.HotelBillLogic,
            state: createState(),
            getInput(id: string): HTMLInputElement {
                return document.getElementById(id) as HTMLInputElement;
            },
            getButton(id: string): HTMLButtonElement {
                return document.getElementById(id) as HTMLButtonElement;
            },
            getElement(id: string): HTMLElement {
                return document.getElementById(id) as HTMLElement;
            }
        };
    }

    runtime.AppContext = {
        createAppContext
    };
})();
