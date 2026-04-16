interface PdfToolExtractFile {
  id: number;
  name: string;
  baseName: string;
  arrayBuffer: ArrayBuffer;
  pdfDoc: any;
  pageCount: number;
  selected: Set<number>;
  lastClicked: number | null;
  previewLoaded: boolean;
}

interface PdfToolMergeFile {
  id: number;
  name: string;
  size: number;
  pageCount: number;
  arrayBuffer: ArrayBuffer;
}

interface PdfToolPdfToImageFile {
  id: number;
  name: string;
  baseName: string;
  size: number;
  arrayBuffer: ArrayBuffer;
}

interface PdfToolImageToPdfFile {
  id: number;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

interface PdfToolSharedApi {
  getElement<T extends HTMLElement>(id: string): T;
  getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D;
  setupUpload(
    areaId: string,
    inputId: string,
    handler: (files: File[]) => void,
    multiple: boolean
  ): void;
  initDragSort<T extends { id: number }>(
    container: HTMLElement,
    dataArray: T[],
    render: () => void
  ): void;
  parseRange(value: string, max: number): number[];
  formatRange(value: Set<number>): string;
  formatSize(bytes: number): string;
  readFileAsDataUrl(file: File): Promise<string>;
  download(blob: Blob, filename: string): void;
}

interface PdfToolRuntime {
  shared: PdfToolSharedApi;
  initExtract(): void;
  initMerge(): void;
  initPdfToImage(): void;
  initImageToPdf(): void;
}

type PdfToolRuntimeRegistry = Partial<PdfToolRuntime>;

interface Window {
  PdfTool?: PdfToolRuntimeRegistry;
}
