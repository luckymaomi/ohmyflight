type CrewFlightWorkbook = import("xlsx-js-style").WorkBook;
type CrewFlightStatsMap = Record<string, Record<string, number>>;
type CrewFlightStatsLogicApi = {
    parseRosterRows(rows: unknown[][]): string[];
    analyzeScheduleRows(
        sheets: Array<{ sheetName: string; rows: unknown[][] }>,
        rosterNames: string[]
    ): { statsResult: CrewFlightStatsMap; routes: string[]; unmatchedCells: string[] };
    getPeopleInRosterOrder(statsResult: CrewFlightStatsMap | null, rosterNames: string[]): string[];
    buildCrewFlightExportRows(statsResult: CrewFlightStatsMap, routes: string[], rosterNames: string[]): Array<Array<string | number>>;
    extractNamesInTextOrder(text: unknown, rosterNames: string[]): string[];
};

interface CrewFlightStatsElements {
    scheduleFile: HTMLInputElement;
    rosterFile: HTMLInputElement;
    rosterStatus: HTMLElement;
    scheduleStatus: HTMLElement;
    sheetSection: HTMLElement;
    sheetSelector: HTMLElement;
    selectAllBtn: HTMLButtonElement;
    selectNoneBtn: HTMLButtonElement;
    analyzeBtn: HTMLButtonElement;
    exportBtn: HTMLButtonElement;
    warningSection: HTMLElement;
    warningList: HTMLElement;
    resultSection: HTMLElement;
    resultHead: HTMLTableSectionElement;
    resultBody: HTMLTableSectionElement;
    resultInfo: HTMLElement;
    crewTableBody: HTMLTableSectionElement;
    extractAllBtn: HTMLButtonElement;
    clearAllBtn: HTMLButtonElement;
    addRowBtn: HTMLButtonElement;
}

interface CrewFlightStatsState {
    scheduleWorkbook: CrewFlightWorkbook | null;
    rosterNames: string[];
    statsResult: CrewFlightStatsMap | null;
    routes: string[];
    selectedSheets: string[];
}

interface CrewFlightStatsContext {
    runtime: Record<string, any>;
    XLSX: typeof import("xlsx-js-style");
    logic: CrewFlightStatsLogicApi;
    elements: CrewFlightStatsElements;
    state: CrewFlightStatsState;
    showStatus(id: 'rosterStatus' | 'scheduleStatus', msg: string, type: 'success' | 'error' | 'loading' | 'hint'): void;
    checkReady(): void;
    getPeopleInRosterOrder(): string[];
}

interface Window {
    CrewFlightStatsApp: Record<string, any>;
    CrewFlightStatsLogic: CrewFlightStatsLogicApi;
    XLSX: typeof import("xlsx-js-style");
}
