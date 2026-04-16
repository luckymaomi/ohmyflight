(function () {
  const runtime = window.ImageTool || (window.ImageTool = {} as ImageToolRuntimeRegistry);

  function getElement<T extends HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
  }

  function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context unavailable");
    }
    return context;
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getBaseName(filename: string): string {
    return filename.replace(/\.[^/.]+$/, "");
  }

  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function setupUpload(
    areaId: string,
    inputId: string,
    handler: (files: File[]) => void,
    multiple: boolean
  ): void {
    const area = getElement<HTMLElement>(areaId);
    const input = getElement<HTMLInputElement>(inputId);

    area.onclick = () => input.click();
    area.ondragover = (event) => {
      event.preventDefault();
      area.classList.add("dragover");
    };
    area.ondragleave = () => area.classList.remove("dragover");
    area.ondrop = (event) => {
      event.preventDefault();
      area.classList.remove("dragover");
      const files = Array.from(event.dataTransfer?.files || []);
      handler(multiple ? files : files.slice(0, 1));
    };
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      handler(Array.from(target.files || []));
      target.value = "";
    };
  }

  function renderImageList(
    images: ImageToolImageItem[],
    listEl: HTMLElement,
    optionsEl: HTMLElement,
    onRemove: (index: number) => void
  ): void {
    if (images.length === 0) {
      listEl.innerHTML = "";
      optionsEl.classList.add("hidden");
      return;
    }

    optionsEl.classList.remove("hidden");
    listEl.innerHTML = images.map((img, index) => `
      <div class="image-item">
        <img src="${img.url}">
        <div class="info">${formatSize(img.file.size)}</div>
        <div class="preview-info" id="${listEl.id}-preview-${index}"></div>
        <button class="remove-btn" data-i="${index}">&times;</button>
      </div>
    `).join("");

    listEl.querySelectorAll<HTMLButtonElement>(".remove-btn").forEach((button) => {
      button.onclick = () => onRemove(parseInt(button.dataset.i || "0", 10));
    });
  }

  function renderResultItem(container: HTMLElement, blob: Blob, text: string, filename: string): void {
    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `
      <img src="${URL.createObjectURL(blob)}">
      <span class="meta">${text}</span>
      <button class="btn btn-outline-secondary btn-sm">下载</button>
    `;

    const downloadButton = item.querySelector("button") as HTMLButtonElement;
    downloadButton.onclick = () => downloadBlob(blob, filename);
    container.appendChild(item);
  }

  runtime.shared = {
    getElement,
    getCanvasContext,
    formatSize,
    getBaseName,
    downloadBlob,
    setupUpload,
    renderImageList,
    renderResultItem
  };
})();
