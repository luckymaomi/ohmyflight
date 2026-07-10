type ManualRole = "my" | "reference";
type ManualFormat = "docx" | "pdf";
type DifferenceKind = "same" | "micro" | "review" | "my-missing" | "reference-missing";

declare function importScripts(...urls: string[]): void;

interface ManualTextUnit {
    id: string;
    manualId: string;
    unitIndex: number;
    title: string;
    pageNumber?: number;
    text: string;
}

interface LocalManual {
    id: string;
    role: ManualRole;
    name: string;
    format: ManualFormat;
    units: ManualTextUnit[];
    pageCount?: number;
    wordPreviewData?: ArrayBuffer;
    pdfDocument?: any;
}

interface WorkerManual {
    id: string;
    name: string;
    units: ManualTextUnit[];
}

interface ManualSlice {
    id: string;
    manualId: string;
    manualName: string;
    sliceIndex: number;
    unitId: string;
    unitIndex: number;
    title: string;
    pageNumber?: number;
    text: string;
    normalized: string;
    keyTokens: string[];
    weight: number;
}

interface ReferenceMatch {
    referenceSliceId: string;
    referenceWindowSliceIds: string[];
    similarity: number;
    coverage: number;
    missingTokens: string[];
    extraTokens: string[];
}

interface MyManualResult {
    id: string;
    kind: "same" | "micro" | "review" | "reference-missing";
    mySliceId: string;
    referenceMatch?: ReferenceMatch;
    similarity: number;
    coverage: number;
    missingTokens: string[];
    extraTokens: string[];
    reason: string;
}

interface ReferenceMissingResult {
    id: string;
    kind: "my-missing";
    referenceSliceId: string;
    reason: string;
}

interface StructuralDifferenceBlock {
    id: string;
    kind: "my-missing" | "reference-missing";
    sliceIds: string[];
    location: string;
    title: string;
}

interface ComparisonSummary {
    myManualName: string;
    referenceManualName: string;
    mySliceCount: number;
    referenceSliceCount: number;
    sameCount: number;
    microCount: number;
    reviewCount: number;
    myMissingBlockCount: number;
    referenceMissingBlockCount: number;
    conflictCount: number;
    myCoverageRate: number;
    averageSimilarity: number;
}

interface ManualComparison {
    mySlices: ManualSlice[];
    referenceSlices: ManualSlice[];
    myResults: MyManualResult[];
    referenceMissingResults: ReferenceMissingResult[];
    myMissingBlocks: StructuralDifferenceBlock[];
    referenceMissingBlocks: StructuralDifferenceBlock[];
    conflictResultIds: string[];
    summary: ComparisonSummary;
}

interface ComparisonProgress {
    phase: string;
    completed: number;
    total: number;
}

interface ComparisonOptions {
    weakPhrases?: string[];
}

interface ComparisonWorkerRequest {
    type: "compare";
    requestId: number;
    myManual: WorkerManual;
    referenceManual: WorkerManual;
    options?: ComparisonOptions;
}

interface ComparisonWorkerProgress {
    type: "progress";
    requestId: number;
    progress: ComparisonProgress;
}

interface ComparisonWorkerSuccess {
    type: "success";
    requestId: number;
    comparison: ManualComparison;
}

interface ComparisonWorkerFailure {
    type: "failure";
    requestId: number;
    message: string;
}

interface DifferenceNavigationEntry {
    id: string;
    kind: "my-missing" | "reference-missing" | "micro" | "review";
    title: string;
    location: string;
    reason: string;
    text: string;
    mySliceIds: string[];
    referenceSliceIds: string[];
}

interface VirtualNavigationWindow {
    start: number;
    end: number;
    offsetTop: number;
    totalHeight: number;
}

interface Window {
    ManualProof: any;
    mammoth: any;
    docx: any;
    pdfjsLib: any;
    XLSX: any;
}
