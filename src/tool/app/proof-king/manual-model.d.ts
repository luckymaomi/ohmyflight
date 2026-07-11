type ManualRole = "my" | "reference";
type ManualFormat = "docx" | "pdf";
type ManualUnitKind = "paragraph" | "table-row" | "pdf-paragraph";
type RevisionKind = "reference-added" | "reference-removed" | "modified" | "review";
type DiffKind = "equal" | "added" | "removed";

declare function importScripts(...urls: string[]): void;

interface ManualUnit {
    id: string;
    manualId: string;
    index: number;
    kind: ManualUnitKind;
    text: string;
    title: string;
    pageNumber?: number;
}

interface LocalManual {
    id: string;
    role: ManualRole;
    name: string;
    format: ManualFormat;
    units: ManualUnit[];
    pageCount?: number;
    pdfDocument?: any;
}

interface WorkerManual {
    id: string;
    name: string;
    units: ManualUnit[];
}

interface ComparisonSlice {
    id: string;
    manualId: string;
    index: number;
    unitId: string;
    unitIndex: number;
    text: string;
    normalized: string;
    grams: string[];
    tokens: string[];
    title: string;
    pageNumber?: number;
}

interface DiffSegment {
    kind: DiffKind;
    text: string;
}

interface RevisionEvent {
    id: string;
    kind: RevisionKind;
    title: string;
    mySliceIds: string[];
    referenceSliceIds: string[];
    myUnitIds: string[];
    referenceUnitIds: string[];
    myText: string;
    referenceText: string;
    myLocation: string;
    referenceLocation: string;
    similarity: number;
    myTokensOnly: string[];
    referenceTokensOnly: string[];
    myDiff: DiffSegment[];
    referenceDiff: DiffSegment[];
    reason: string;
}

interface ComparisonSummary {
    myManualName: string;
    referenceManualName: string;
    mySliceCount: number;
    referenceSliceCount: number;
    exactAnchorCount: number;
    sameSliceCount: number;
    referenceAddedCount: number;
    referenceRemovedCount: number;
    modifiedCount: number;
    reviewCount: number;
}

interface ManualComparison {
    mySlices: ComparisonSlice[];
    referenceSlices: ComparisonSlice[];
    events: RevisionEvent[];
    summary: ComparisonSummary;
}

interface ComparisonOptions {
    weakPhrases?: string[];
    minimumCandidateSimilarity?: number;
}

interface ComparisonProgress {
    phase: string;
    completed: number;
    total: number;
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

interface PdfLineRecord {
    pageNumber: number;
    text: string;
    x: number;
    y: number;
    topRatio: number;
}

interface VirtualWindow {
    start: number;
    end: number;
    offsetTop: number;
    totalHeight: number;
}

interface Window {
    ManualProof: any;
    mammoth: any;
    pdfjsLib: any;
    XLSX: any;
}
