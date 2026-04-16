(function () {
  const runtime = window.ImageTool || (window.ImageTool = {} as ImageToolRuntimeRegistry);

  function initBase64(): void {
    const tools = runtime.shared;
    if (!tools) {
      throw new Error("Image tool shared runtime is unavailable");
    }

    let imageBlob: Blob | null = null;

    tools.setupUpload("b64Upload", "b64Input", (files) => {
      if (files[0]) {
        toBase64(files[0]);
      }
    }, false);

    tools.getElement<HTMLButtonElement>("b64CopyBtn").addEventListener("click", async () => {
      const output = tools.getElement<HTMLTextAreaElement>("base64Output");
      output.select();

      try {
        await navigator.clipboard.writeText(output.value);
        const button = tools.getElement<HTMLButtonElement>("b64CopyBtn");
        button.textContent = "已复制";
        window.setTimeout(() => {
          button.textContent = "复制";
        }, 1500);
      } catch {
        document.execCommand("copy");
      }
    });

    tools.getElement<HTMLButtonElement>("b64ConvertBtn").addEventListener("click", fromBase64);
    tools.getElement<HTMLButtonElement>("b64DownloadBtn").addEventListener("click", () => {
      if (imageBlob) {
        tools.downloadBlob(imageBlob, "image.png");
      }
    });

    function toBase64(file: File): void {
      const reader = new FileReader();
      reader.onload = () => {
        tools.getElement<HTMLTextAreaElement>("base64Output").value = typeof reader.result === "string" ? reader.result : "";
        tools.getElement<HTMLElement>("b64ToResult").classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    }

    function fromBase64(): void {
      let base64 = tools.getElement<HTMLTextAreaElement>("base64Input").value.trim();
      if (!base64) {
        return;
      }
      if (!base64.startsWith("data:")) {
        base64 = `data:image/png;base64,${base64}`;
      }

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        tools.getCanvasContext(canvas).drawImage(image, 0, 0);

        canvas.toBlob((blob) => {
          if (!blob) {
            return;
          }

          imageBlob = blob;
          tools.getElement<HTMLImageElement>("b64Output").src = URL.createObjectURL(blob);
          tools.getElement<HTMLElement>("b64Info").textContent = `${image.width}x${image.height} | ${tools.formatSize(blob.size)}`;
          tools.getElement<HTMLElement>("b64FromResult").classList.remove("hidden");
        }, "image/png");
      };
      image.onerror = () => {
        alert("无效的 Base64 编码");
      };
      image.src = base64;
    }
  }

  runtime.initBase64 = initBase64;
})();
