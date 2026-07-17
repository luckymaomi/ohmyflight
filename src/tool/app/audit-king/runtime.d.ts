interface AuditKingTextBlock {
    id: string;
    documentId: string;
    documentName: string;
    blockIndex: number;
    title: string;
    text: string;
    pageNumber?: number;
}

interface AuditKingDocument {
    id: string;
    name: string;
    blocks: AuditKingTextBlock[];
    enabled?: boolean;
    format?: "docx" | "pdf";
    pageCount?: number;
    sourceFile: File;
}

interface AuditKingCheckItemSource {
    blockId?: string;
    blockIndex?: number;
    start?: number;
    end?: number;
    text?: string;
    beforeText?: string;
    afterText?: string;
}

interface AuditKingManualEvidence {
    id?: string;
    sourceType?: "summary" | "selection" | "";
    documentId?: string;
    documentName: string;
    blockId?: string;
    blockIndex?: number;
    pageNumber?: number;
    title?: string;
    start?: number;
    end?: number;
    globalStart?: number;
    globalEnd?: number;
    text: string;
    beforeText?: string;
    afterText?: string;
    mode?: "exact" | "loose" | "";
    note?: string;
}

interface AuditKingAuditEvidence {
    id: string;
    content: string;
    note: string;
    sourceEvidenceId?: string;
}

interface AuditKingCheckItem {
    id: string;
    code: string;
    name: string;
    keyword: string;
    color: string;
    enabled: boolean;
    source?: AuditKingCheckItemSource;
    manualEvidences: AuditKingManualEvidence[];
    auditEvidences: AuditKingAuditEvidence[];
}

interface AuditKingImportedCheckItem {
    id?: string;
    order?: number;
    code?: string;
    name?: string;
    keyword?: string;
    color?: string;
    enabled?: boolean;
    source?: AuditKingCheckItemSource;
    manualEvidences?: AuditKingManualEvidence[];
    auditEvidences?: AuditKingAuditEvidence[];
}

interface AuditKingMatch {
    id: string;
    checkItemId: string;
    keywordText: string;
    keywordColor: string;
    documentId: string;
    documentName: string;
    blockId: string;
    blockIndex: number;
    pageNumber?: number;
    title: string;
    start: number;
    end: number;
    mode: "exact" | "loose";
    matchedText: string;
    blockText: string;
}

interface AuditKingSearchResult {
    matches: AuditKingMatch[];
    countsByCheckItem: Record<string, number>;
}

interface AuditKingIndexedBlock extends AuditKingTextBlock {
    looseText: string;
    looseOffsetMap: Array<{
        originalStart: number;
        originalEnd: number;
        normalizedText: string;
    }>;
}

interface AuditKingDocumentIndex {
    documents: AuditKingDocument[];
    blocks: AuditKingIndexedBlock[];
    grams: Record<string, number[]>;
    flexIndex: any;
}

interface AuditKingHighlightRange {
    checkItemId: string;
    color: string;
    start: number;
    end: number;
    kind?: "keyword" | "manual-evidence";
    evidenceId?: string;
}

interface AuditKingEvidenceEntry {
    content: string;
    note: string;
}

interface AuditKingEvidenceGroup {
    id: string;
    title: string;
    items: AuditKingEvidenceEntry[];
}

interface AuditKingImportedAuditGroup {
    code: string;
    name: string;
    items: AuditKingEvidenceEntry[];
}

interface AuditKingFolderScriptConfig {
    rangeText: string;
}

interface AuditKingPdfLocatorPage {
    pdfId: string;
    pdfName: string;
    pageNumber: number;
    text: string;
}

interface AuditKingPdfLocatorDocument {
    id: string;
    name: string;
    pageCount: number;
    arrayBuffer?: ArrayBuffer;
    pdf?: any;
    pages: AuditKingPdfLocatorPage[];
    sourceFile: File;
}

interface AuditKingPdfLocatorTarget {
    sequence: string;
    title?: string;
    content: string;
    note?: string;
}

interface AuditKingPdfLocatorResult {
    sequence: string;
    title: string;
    content: string;
    status: "trusted" | "review" | "miss" | "skip";
    pdfId?: string;
    pdfName?: string;
    startPage?: number;
    endPage?: number;
    coverage: number;
    orderRatio: number;
    score: number;
    matchedSegments: number;
    totalSegments: number;
    reason: string;
    snippets: string[];
    comparisons?: AuditKingPdfLocatorSegmentComparison[];
}

interface AuditKingPdfLocatorSegmentComparison {
    text: string;
    matched: boolean;
}

interface AuditKingPdfLocatorSlot {
    id: string;
    sequence: string;
    title: string;
    content: string;
    note: string;
    selected: boolean;
    pdfId: string;
    pdfName?: string;
    startPage: number | "";
    endPage: number | "";
    result?: AuditKingPdfLocatorResult;
}

interface AuditKingPdfLocatorWorkspaceSnapshot {
    version: number;
    exportedAt: string;
    selectedSlotId: string;
    expandContextPages: boolean;
    slots: AuditKingPdfLocatorSlot[];
}

interface AuditKingPdfLocatorExportTask {
    slotId: string;
    sequence: string;
    title: string;
    pdfId: string;
    pdfName: string;
    startPage: number;
    endPage: number;
    filename: string;
    skippedReason?: string;
}

interface AuditKingPdfLocatorState {
    documents: AuditKingPdfLocatorDocument[];
    results: AuditKingPdfLocatorResult[];
    slots: AuditKingPdfLocatorSlot[];
    selectedSlotId: string;
    expandContextPages: boolean;
    summary: { trusted: number; review: number; miss: number; skip: number };
}

interface AuditKingStateModel {
    checklistFile: File | null;
    checklistBlocks: AuditKingTextBlock[];
    documents: AuditKingDocument[];
    documentIndex: AuditKingDocumentIndex | null;
    checkItems: AuditKingCheckItem[];
    searchResult: AuditKingSearchResult;
    currentCheckItemId: string;
    documentFilterId: string;
    currentMatchIndex: number;
    currentDetailContextLength: number;
    pdfLocator: AuditKingPdfLocatorState;
}

interface AuditProjectSourceMetadata {
    path: string;
    name: string;
    type: string;
}

interface AuditProjectSnapshot {
    version: number;
    sources: {
        checklist: AuditProjectSourceMetadata;
        manuals: AuditProjectSourceMetadata[];
        locatorFiles: AuditProjectSourceMetadata[];
    };
    checkItems: AuditKingCheckItem[];
    pdfWorkspace: {
        slots: AuditKingPdfLocatorSlot[];
        selectedSlotId: string;
        expandContextPages: boolean;
    };
    view: {
        currentCheckItemId: string;
        documentFilterId: string;
    };
}

interface AuditProjectBuildInput {
    checklistFile: File;
    manualFiles: File[];
    locatorFiles: File[];
    state: {
        checkItems: AuditKingCheckItem[];
        pdfWorkspace: AuditProjectSnapshot["pdfWorkspace"];
        view: AuditProjectSnapshot["view"];
    };
    workbook: Uint8Array;
    onProgress?: (message: string, completed: number, total: number) => void;
}

interface AuditProjectReadResult {
    state: AuditProjectSnapshot;
    checklistFile: File;
    manualFiles: File[];
    locatorFiles: File[];
    workbook: Uint8Array;
}

interface AuditKingAppContext {
    runtime: Record<string, any>;
    state: AuditKingStateModel;
    getElement<T extends HTMLElement>(id: string): T;
    recomputeSearch(): void;
    refresh(message?: string, type?: "info" | "success" | "error"): void;
    getFilteredMatches(): AuditKingMatch[];
    getCurrentFilteredMatch(): AuditKingMatch | null;
    focusMatch(index: number): void;
    formatLocalDate(date: Date): string;
}

interface AuditProjectRestoreInput {
    checklistFile: File;
    checklistBlocks: AuditKingTextBlock[];
    documents: AuditKingDocument[];
    checkItems: AuditKingCheckItem[];
    locatorDocuments: AuditKingPdfLocatorDocument[];
    pdfWorkspace: AuditProjectSnapshot["pdfWorkspace"];
    view: AuditProjectSnapshot["view"];
}

interface Window {
    AuditKing: Record<string, any>;
    FlexSearch: any;
    mammoth: any;
    pdfjsLib: any;
    PDFLib: any;
    JSZip: any;
}

declare const JSZip: any;
