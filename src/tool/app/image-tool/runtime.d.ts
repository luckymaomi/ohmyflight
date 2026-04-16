interface ImageToolImageItem {
  file: File;
  url: string;
}

interface ImageToolImageProcessResult {
  blob: Blob;
  width: number;
  height: number;
}

interface ImageToolCompressionOptions {
  maxSizeMB: number;
  useWebWorker: boolean;
  initialQuality: number;
  maxWidthOrHeight?: number;
}

interface ImageToolSharedApi {
  getElement<T extends HTMLElement>(id: string): T;
  getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D;
  formatSize(bytes: number): string;
  getBaseName(filename: string): string;
  downloadBlob(blob: Blob, filename: string): void;
  setupUpload(
    areaId: string,
    inputId: string,
    handler: (files: File[]) => void,
    multiple: boolean
  ): void;
  renderImageList(
    images: ImageToolImageItem[],
    listEl: HTMLElement,
    optionsEl: HTMLElement,
    onRemove: (index: number) => void
  ): void;
  renderResultItem(container: HTMLElement, blob: Blob, text: string, filename: string): void;
}

interface ImageToolRuntime {
  shared: ImageToolSharedApi;
  initConvert(): void;
  initCompress(): void;
  initResize(): void;
  initCrop(): void;
  initBase64(): void;
}

type ImageToolRuntimeRegistry = Partial<ImageToolRuntime>;

interface Window {
  ImageTool?: ImageToolRuntimeRegistry;
}
