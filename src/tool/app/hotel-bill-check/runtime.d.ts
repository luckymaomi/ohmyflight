type HotelBillWorkbookRow = Array<string | number | boolean | Date | null | undefined>;
type HotelBillWorkSheet = import("xlsx-js-style").WorkSheet;
type HotelBillWorkbook = {
    SheetNames: string[];
    Sheets: Record<string, HotelBillWorkSheet>;
};
type HotelBillHyperlinkInfo = { url: string; display: string };
type HotelBillHyperlinkMap = Record<number, Record<number, HotelBillHyperlinkInfo>>;
type HotelBillMatchStatus = 'matched' | 'duplicate' | 'unmatched';
type HotelBillMatchResult = {
    status: HotelBillMatchStatus;
    billRow: HotelBillWorkbookRow;
    billIdx: number;
    checkinRow: HotelBillWorkbookRow | null;
    checkinIdx: number;
};
type HotelBillProofLinkColumn = {
    header: string;
    link: HotelBillHyperlinkInfo | null;
};

interface HotelBillState {
    billWorkbook: HotelBillWorkbook | null;
    checkinWorkbook: HotelBillWorkbook | null;
    billData: HotelBillWorkbookRow[];
    checkinData: HotelBillWorkbookRow[];
    billColumns: string[];
    checkinColumns: string[];
    billHyperlinks: HotelBillHyperlinkMap;
    checkinHyperlinks: HotelBillHyperlinkMap;
    matchResults: HotelBillMatchResult[];
}

interface HotelBillLogicApi {
    parseDate(value: unknown): Date | null;
    matchRows(input: {
        billData: HotelBillWorkbookRow[];
        checkinData: HotelBillWorkbookRow[];
        billNameCol: number;
        billDateCol: number;
        checkinNameCol: number;
        checkinDateCol: number;
        tolerance: number;
    }): {
        results: HotelBillMatchResult[];
        skippedBillLogs: Array<Record<string, unknown>>;
        candidateLogs: Array<Record<string, unknown>>;
    };
    getProofLinks(result: HotelBillMatchResult, checkinColumns: string[], checkinHyperlinks: HotelBillHyperlinkMap): HotelBillHyperlinkInfo[];
    getProofColumnCount(results: HotelBillMatchResult[], checkinColumns: string[], checkinHyperlinks: HotelBillHyperlinkMap): number;
    buildProofLinkColumns(
        result: HotelBillMatchResult,
        columnCount: number,
        checkinColumns: string[],
        checkinHyperlinks: HotelBillHyperlinkMap
    ): HotelBillProofLinkColumn[];
}

interface HotelBillContext {
    runtime: Record<string, any>;
    XLSX: typeof import("xlsx-js-style");
    logic: HotelBillLogicApi;
    state: HotelBillState;
    getInput(id: string): HTMLInputElement;
    getButton(id: string): HTMLButtonElement;
    getElement(id: string): HTMLElement;
}

interface Window {
    HotelBillCheck: Record<string, any>;
    HotelBillLogic: HotelBillLogicApi;
    XLSX: typeof import("xlsx-js-style");
}
