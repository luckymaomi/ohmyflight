type SessionBillWorkbook = import("xlsx-js-style").WorkBook;
type SessionBillSheet = import("xlsx-js-style").WorkSheet;

type SessionBillSheetRow = {
    sheetName: string;
    rowNumber: number;
    cells: unknown[];
};

type SessionBillSourceEntry = {
    name: string;
    matchName: string;
    source: "场次" | "账单";
    sheetName: string;
    rowNumber: number;
    role?: string;
    sourceColumn?: string;
    dateText?: string;
    startText?: string;
    endText?: string;
    groupText?: string;
    natureText?: string;
    modelText?: string;
    deviceText?: string;
    quantityText?: string;
    amountText?: string;
};

type SessionBillStatus = "一致" | "场次多" | "账单多" | "仅场次有" | "仅账单有";

type SessionBillCompareRow = {
    key: string;
    status: SessionBillStatus;
    name: string;
    matchedNames: string;
    sessionCount: number;
    billCount: number;
    diff: number;
    sessionRefs: string;
    billRefs: string;
    note: string;
};

type SessionBillSummary = {
    sessionTotal: number;
    sessionUnique: number;
    billTotal: number;
    billUnique: number;
    comparedNames: number;
    matchedNames: number;
    mismatchNames: number;
    statusCounts: Record<SessionBillStatus, number>;
};

type SessionBillCompareResult = {
    summary: SessionBillSummary;
    rows: SessionBillCompareRow[];
    sessionEntries: SessionBillSourceEntry[];
    billEntries: SessionBillSourceEntry[];
    statusRows: { status: SessionBillStatus; total: number }[];
    sourceInfo: {
        sessionSheetName: string;
        billSheetNames: string[];
    };
    groupsByKey: Record<string, {
        sessionEntries: SessionBillSourceEntry[];
        billEntries: SessionBillSourceEntry[];
    }>;
};

type SessionBillLogicApi = {
    splitNames: (value: unknown) => string[];
    analyzeSessionWorkbook: (workbook: SessionBillWorkbook) => {
        entries: SessionBillSourceEntry[];
        sheetName: string;
        rowCount: number;
    };
    analyzeBillWorkbook: (workbook: SessionBillWorkbook) => {
        entries: SessionBillSourceEntry[];
        sheetNames: string[];
        rowCount: number;
    };
    compareEntries: (
        sessionEntries: SessionBillSourceEntry[],
        billEntries: SessionBillSourceEntry[],
        sourceInfo?: { sessionSheetName?: string; billSheetNames?: string[] }
    ) => SessionBillCompareResult;
    buildExportWorkbook: (result: SessionBillCompareResult) => SessionBillWorkbook;
    buildOutputFileName: () => string;
};

type SessionBillRuntime = Window & {
    XLSX: typeof import("xlsx-js-style");
    SessionBillLogic?: SessionBillLogicApi;
    echarts?: any;
};
