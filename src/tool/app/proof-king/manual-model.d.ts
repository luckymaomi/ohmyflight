type ManualRole = "my" | "reference";
type ManualFormat = "docx" | "pdf";
type ManualUnitKind = "paragraph" | "table-row" | "pdf-paragraph";
type RevisionKind = "reference-added" | "reference-removed" | "modified" | "review";
type DiffKind = "equal" | "added" | "removed";
type RevisionDecision = "pending" | "included" | "excluded";
type RevisionDecisionMap = Record<string, RevisionDecision>;

interface RevisionDecisionSummary {
    pending: number;
    included: number;
    excluded: number;
}

interface AlignmentMatch {
    myStart: number;
    myEnd: number;
    referenceStart: number;
    referenceEnd: number;
    exact: boolean;
    similarity: number;
}

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
    sourceFile: File;
    pageCount?: number;
    pdfStartPage?: number;
    pdfEndPage?: number;
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

interface RevisionContextAnchor {
    position: "before" | "after";
    mySliceId: string;
    referenceSliceId: string;
    myUnitId: string;
    referenceUnitId: string;
    myText: string;
    referenceText: string;
    myUnitIndex: number;
    referenceUnitIndex: number;
    myPageNumber?: number;
    referencePageNumber?: number;
    exact: boolean;
    similarity: number;
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
    contextAnchors: RevisionContextAnchor[];
    reason: string;
}

interface RevisionNavigationEvent extends RevisionEvent {
    viewChapter?: string;
    searchScore?: number;
    matchedSide?: "title" | "my" | "reference" | "both";
    matchedExcerpt?: string;
}

interface RevisionCategoryCount {
    kind: RevisionKind | "all";
    label: string;
    total: number;
    matched: number;
}

interface RevisionSectionGroup {
    key: string;
    label: string;
    count: number;
    startEventId: string;
    events: RevisionNavigationEvent[];
}

interface RevisionChapterGroup {
    key: string;
    label: string;
    count: number;
    sections: RevisionSectionGroup[];
}

interface ReportTextRun {
    text: string;
    color: "000000" | "FF0000" | "00B0F0";
}

interface RevisionReportRow {
    kind: RevisionKind;
    chapter: string;
    number: string;
    title: string;
    explanation: string;
    myLocation: string;
    referenceLocation: string;
    myRuns: ReportTextRun[];
    referenceRuns: ReportTextRun[];
}

interface RevisionReportGroup {
    key: string;
    kind: RevisionKind;
    chapter: string;
    number: string;
    title: string;
    rows: RevisionReportRow[];
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

interface ProofProjectManualMetadata {
    path: string;
    name: string;
    type: string;
    range: { startPage: number | ""; endPage: number | "" };
}

interface ProofProjectViewState {
    filter: RevisionKind | "all";
    query: string;
    selectedId: string;
    expandedChapterKey: string;
    onlyIncluded?: boolean;
    scrollTop?: number;
}

interface ProofProjectSnapshot {
    version: number;
    manuals: { my: ProofProjectManualMetadata; reference: ProofProjectManualMetadata };
    comparison: ManualComparison;
    decisions: RevisionDecisionMap;
    view: ProofProjectViewState;
}

interface ProofProjectBuildInput {
    myFile: File;
    referenceFile: File;
    myRange: { startPage: number | ""; endPage: number | "" };
    referenceRange: { startPage: number | ""; endPage: number | "" };
    comparison: ManualComparison;
    decisions: RevisionDecisionMap;
    view: ProofProjectViewState;
    workbook: Uint8Array;
    onProgress?: (message: string, completed: number, total: number) => void;
}

interface ProofProjectReadResult {
    state: ProofProjectSnapshot;
    myFile: File;
    referenceFile: File;
    workbook: Uint8Array;
}

interface ProofWorkspaceProjectInput {
    myFile: File;
    referenceFile: File;
    myRange: { startPage: number | ""; endPage: number | "" };
    referenceRange: { startPage: number | ""; endPage: number | "" };
    comparison: ManualComparison;
    decisions: RevisionDecisionMap;
    view: ProofProjectViewState;
}

interface ProofProjectActionsContext {
    getProjectInput(): ProofWorkspaceProjectInput | null;
    restoreProject(result: ProofProjectReadResult): Promise<void>;
    markProjectSaved(): void;
    setMessage(message: string, tone: "secondary" | "info" | "success" | "danger"): void;
}

interface ManualProofHookConfig {
    ignoredNoisePhrases?: string[];
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
    ManualProofHooks?: ManualProofHookConfig;
    mammoth: any;
    pdfjsLib: any;
    XLSX: any;
    docx: any;
    JSZip: any;
}
