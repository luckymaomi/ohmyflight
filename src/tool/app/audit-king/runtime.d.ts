interface AuditKingTextBlock {
    id: string;
    documentId: string;
    documentName: string;
    blockIndex: number;
    title: string;
    text: string;
}

interface AuditKingDocument {
    id: string;
    name: string;
    blocks: AuditKingTextBlock[];
    enabled?: boolean;
}

interface AuditKingKeyword {
    id: string;
    text: string;
    label?: string;
    color: string;
    enabled: boolean;
    source?: AuditKingKeywordSource;
    evidences?: AuditKingManualEvidence[];
}

interface AuditKingKeywordSource {
    blockId?: string;
    blockIndex?: number;
    start?: number;
    end?: number;
    text?: string;
    beforeText?: string;
    afterText?: string;
}

interface AuditKingImportedKeyword {
    text: string;
    order?: number;
    label?: string;
    color?: string;
    enabled?: boolean;
    source?: AuditKingKeywordSource;
    evidences?: AuditKingManualEvidence[];
}

interface AuditKingManualEvidence {
    id?: string;
    sourceType?: "summary" | "selection" | "";
    documentId?: string;
    documentName: string;
    blockId?: string;
    blockIndex?: number;
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

interface AuditKingMatch {
    id: string;
    keywordId: string;
    keywordText: string;
    keywordColor: string;
    documentId: string;
    documentName: string;
    blockId: string;
    blockIndex: number;
    title: string;
    start: number;
    end: number;
    mode: "exact" | "loose";
    matchedText: string;
    blockText: string;
}

interface AuditKingSearchResult {
    matches: AuditKingMatch[];
    countsByKeyword: Record<string, number>;
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
    keywordId: string;
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
    summary: {
        trusted: number;
        review: number;
        miss: number;
        skip: number;
    };
}

interface AuditKingStateModel {
    checklistBlocks: AuditKingTextBlock[];
    documents: AuditKingDocument[];
    documentIndex: AuditKingDocumentIndex | null;
    keywords: AuditKingKeyword[];
    searchResult: AuditKingSearchResult;
    currentKeywordId: string;
    documentFilterId: string;
    currentMatchIndex: number;
    currentDetailContextLength: number;
    evidenceGroups: AuditKingEvidenceGroup[];
    pdfLocator: AuditKingPdfLocatorState;
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

interface Window {
    AuditKing: Record<string, any>;
    FlexSearch: any;
    mammoth: any;
    pdfjsLib: any;
    PDFLib: any;
    JSZip: any;
}

declare const JSZip: any;
