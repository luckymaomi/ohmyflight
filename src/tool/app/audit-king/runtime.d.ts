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
    documentId?: string;
    documentName: string;
    blockId?: string;
    blockIndex?: number;
    title?: string;
    start?: number;
    end?: number;
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
}

interface Window {
    AuditKing: Record<string, any>;
    FlexSearch: any;
    mammoth: any;
}
