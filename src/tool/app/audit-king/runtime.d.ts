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
}

interface AuditKingKeyword {
    id: string;
    text: string;
    color: string;
    enabled: boolean;
    source?: AuditKingKeywordSource;
}

interface AuditKingKeywordSource {
    blockId: string;
    start: number;
    end: number;
}

interface AuditKingImportedKeyword {
    text: string;
    color?: string;
    enabled?: boolean;
    source?: AuditKingKeywordSource;
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

interface AuditKingEvidenceItem {
    keywordText: string;
    title: string;
    checklistClause: string;
    documentName: string;
    locationLabel: string;
    excerpt: string;
    note: string;
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
    evidenceItems: AuditKingEvidenceItem[];
}

interface Window {
    AuditKing: Record<string, any>;
    FlexSearch: any;
    mammoth: any;
}
