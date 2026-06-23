type FocusCrewCategory = '重点关注' | '一般关注' | '预防性关注' | '三新人员（不上会）' | '长期关注';
type FocusCrewJsonRow = unknown[];
type FocusCrewCategoryTotals = Partial<Record<FocusCrewCategory, number>>;

interface FocusSheetInfo {
    name: string;
    category: FocusCrewCategory;
    columns: string[];
    data: FocusCrewJsonRow[];
}

interface FocusCrewCategoryConfigEntry {
    priority: number;
    color: string;
    label: string;
}

interface FocusCrewViewApi {
    renderFocusSheets(
        container: HTMLElement,
        focusSheets: FocusSheetInfo[],
        categoryConfig: Record<FocusCrewCategory, FocusCrewCategoryConfigEntry>
    ): void;
    renderPreview(
        table: HTMLTableElement,
        columns: string[],
        rows: FocusCrewJsonRow[]
    ): void;
    renderSelectors(
        idSelect: HTMLSelectElement,
        nameSelect: HTMLSelectElement,
        columns: string[]
    ): void;
    displayStats(
        statsDiv: HTMLElement,
        totalFocus: number,
        matchedCategories: FocusCrewCategoryTotals,
        categoryConfig: Record<FocusCrewCategory, FocusCrewCategoryConfigEntry>
    ): void;
}

interface FocusCrewCollectResult {
    focusData: Record<string, FocusCrewCategory[]>;
    focusNames: string[];
}

interface FocusCrewHighlightResult {
    workbook: import("xlsx-js-style").WorkBook;
    matchedCategories: FocusCrewCategoryTotals;
    sheetMatchCounts: Record<string, number>;
}

interface FocusCrewLogicApi {
    CATEGORY_CONFIG: Record<FocusCrewCategory, FocusCrewCategoryConfigEntry>;
    detectCategory(sheetName: string): FocusCrewCategory | null;
    parseFocusWorkbook(workbook: import("xlsx-js-style").WorkBook): FocusSheetInfo[];
    collectFocusData(
        focusSheets: FocusSheetInfo[],
        nameColumnBySheetIndex: Record<number, number>
    ): FocusCrewCollectResult;
    buildHighlightedWorkbook(
        scheduleWorkbook: import("xlsx-js-style").WorkBook,
        scheduleNameCol: number,
        focusData: Record<string, FocusCrewCategory[]>
    ): FocusCrewHighlightResult;
}

interface Window {
    FocusCrewView: FocusCrewViewApi;
    FocusCrewLogic: FocusCrewLogicApi;
}
