type PdfStampRuleMode = 'all' | 'odd' | 'even' | 'range';
type PdfStampResizeDirection = 'tl' | 'tr' | 'bl' | 'br';

interface PdfStampRule {
    id: number;
    mode: PdfStampRuleMode;
    rangeStr: string;
    xMm: number;
    yMm: number;
    wMm: number;
    hMm: number;
    opacity: number;
    lockRatio: boolean;
}

interface PdfStampState {
    pdfArrayBuffer: ArrayBuffer | null;
    pdfDoc: any;
    pageCount: number;
    currentPage: number;
    pageWidth: number;
    pageHeight: number;
    renderScale: number;
    imgDataUrl: string | null;
    imgAspect: number;
    pdfFileName: string;
    rules: PdfStampRule[];
    activeRuleId: number | null;
    nextRuleId: number;
    previewMode: boolean;
}

interface PdfStampLogicApi {
    MM2PT: number;
    createRule(id: number, imgAspect: number, overrides?: Partial<PdfStampRule>): PdfStampRule;
    parsePageRange(rangeStr: string, maxPage: number): number[];
    ruleMatchesPage(rule: Pick<PdfStampRule, 'mode' | 'rangeStr'>, pageNum: number, maxPage: number): boolean;
    getRulesForPage(rules: PdfStampRule[], pageNum: number, maxPage: number): PdfStampRule[];
    buildStampDrawOptions(rule: PdfStampRule, pageHeightPt: number): {
        x: number;
        y: number;
        width: number;
        height: number;
        opacity: number;
    };
    updateRuleField(rule: PdfStampRule, field: keyof PdfStampRule, value: unknown, imgAspect: number): PdfStampRule;
    buildOverlayStyle(rule: PdfStampRule, renderScale: number): {
        leftPx: number;
        topPx: number;
        widthPx: number;
        heightPx: number;
        opacity: string;
    };
    applyOverlayMove(rule: PdfStampRule, input: {
        dxPx: number;
        dyPx: number;
        startLeftPx: number;
        startTopPx: number;
        widthPx: number;
        heightPx: number;
        canvasWidthPx: number;
        canvasHeightPx: number;
        renderScale: number;
    }): PdfStampRule;
    applyOverlayResize(rule: PdfStampRule, input: {
        direction: PdfStampResizeDirection;
        dxPx: number;
        dyPx: number;
        startLeftPx: number;
        startTopPx: number;
        startWidthPx: number;
        startHeightPx: number;
        renderScale: number;
        imgAspect: number;
    }): PdfStampRule;
    buildExportPlan(rules: PdfStampRule[], totalPages: number): Array<{ pageNum: number; rules: PdfStampRule[] }>;
}

interface PdfStampAppContext {
    runtime: Record<string, any>;
    logic: PdfStampLogicApi;
    state: PdfStampState;
    getElement<T extends HTMLElement>(id: string): T;
    getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D;
    showStatus(message: string, type: string, progress?: number): void;
    readAsDataUrl(file: File): Promise<string>;
    download(blob: Blob, filename: string): void;
    getActiveRule(): PdfStampRule | null;
    replaceRule(rule: PdfStampRule): void;
    refreshRulesAndOverlay(): void;
    updateExportBtn(): void;
}

interface Window {
    PdfStampApp: Record<string, any>;
    PdfStampLogic: PdfStampLogicApi;
    pdfjsLib: any;
    PDFLib: any;
}
