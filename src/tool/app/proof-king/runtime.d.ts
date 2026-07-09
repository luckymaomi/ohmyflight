interface ProofKingDocumentUnit {
    id: string;
    documentId: string;
    documentName: string;
    unitIndex: number;
    title: string;
    pageNumber?: number;
    text: string;
}

interface ProofKingDocument {
    id: string;
    name: string;
    type: "docx" | "pdf";
    units: ProofKingDocumentUnit[];
    pageCount?: number;
    pdf?: any;
}

interface ProofKingSegment {
    id: string;
    documentId: string;
    documentName: string;
    segmentIndex: number;
    unitId: string;
    unitIndex: number;
    title: string;
    pageNumber?: number;
    text: string;
    normalized: string;
    keyTokens: string[];
    weight: number;
}

interface ProofKingSegmenterConfig {
    weakPhraseSet?: Set<string>;
    weakSegmentHook?: (input: {
        text: string;
        normalized: string;
        keyTokens: string[];
    }) => boolean;
}

interface ProofKingSearchIndex {
    segments: ProofKingSegment[];
    grams: Record<string, number[]>;
    flexIndex: any;
}

interface ProofKingCompareMatch {
    segment: ProofKingSegment;
    windowText: string;
    windowNormalized: string;
    windowLocation: string;
    similarity: number;
    coverage: number;
    reverseCoverage: number;
    keyTokenRatio: number;
    missingTokens: string[];
    extraTokens: string[];
}

interface ProofKingCompareRow {
    id: string;
    status: "same" | "modified" | "deleted" | "review";
    source: ProofKingSegment;
    target?: ProofKingCompareMatch;
    similarity: number;
    coverage: number;
    reason: string;
    missingTokens: string[];
    extraTokens: string[];
}

interface ProofKingCompareSummary {
    sourceName: string;
    targetName: string;
    sourceSegments: number;
    targetSegments: number;
    same: number;
    modified: number;
    deleted: number;
    review: number;
    added: number;
    conflicts: number;
    coverageRate: number;
    averageSimilarity: number;
}

interface ProofKingCompareResult {
    sourceDocument: ProofKingDocument;
    targetDocument: ProofKingDocument;
    sourceSegments: ProofKingSegment[];
    targetSegments: ProofKingSegment[];
    rows: ProofKingCompareRow[];
    additions: ProofKingCompareRow[];
    conflicts: ProofKingCompareRow[];
    summary: ProofKingCompareSummary;
}

interface ProofKingState {
    sourceDocument: ProofKingDocument | null;
    targetDocument: ProofKingDocument | null;
    result: ProofKingCompareResult | null;
    selectedReviewId: string;
    message: string;
    messageType: "info" | "success" | "error";
}

interface Window {
    ProofKing: Record<string, any>;
    mammoth: any;
    pdfjsLib: any;
    XLSX: any;
    FlexSearch: any;
}
