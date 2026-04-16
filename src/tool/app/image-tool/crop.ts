(function () {
  const runtime = window.ImageTool || (window.ImageTool = {} as ImageToolRuntimeRegistry);

  function initCrop(): void {
    const tools = runtime.shared;
    if (!tools) {
      throw new Error("Image tool shared runtime is unavailable");
    }

    let cropper: InstanceType<typeof Cropper> | null = null;
    let croppedBlob: Blob | null = null;

    tools.setupUpload("cropUpload", "cropInput", (files) => {
      if (files[0]) {
        loadImage(files[0]);
      }
    }, false);
    tools.getElement<HTMLButtonElement>("cropBtn").addEventListener("click", crop);
    tools.getElement<HTMLButtonElement>("cropResetBtn").addEventListener("click", reset);
    tools.getElement<HTMLButtonElement>("cropDownloadBtn").addEventListener("click", () => {
      if (croppedBlob) {
        tools.downloadBlob(croppedBlob, "cropped.png");
      }
    });

    function loadImage(file: File): void {
      const image = tools.getElement<HTMLImageElement>("cropImage");
      image.src = URL.createObjectURL(file);
      image.onload = () => {
        tools.getElement<HTMLElement>("cropEditor").classList.remove("hidden");
        tools.getElement<HTMLElement>("cropResult").classList.add("hidden");

        if (cropper) {
          cropper.destroy();
        }
        cropper = new Cropper(image, {
          aspectRatio: NaN,
          viewMode: 1,
          autoCropArea: 0.8,
          responsive: true
        });
      };
    }

    function crop(): void {
      if (!cropper) {
        return;
      }

      const canvas = cropper.getCroppedCanvas();
      canvas.toBlob((blob) => {
        if (!blob) {
          return;
        }

        croppedBlob = blob;
        tools.getElement<HTMLImageElement>("cropOutput").src = URL.createObjectURL(blob);
        tools.getElement<HTMLElement>("cropInfo").textContent = `${canvas.width}x${canvas.height} | ${tools.formatSize(blob.size)}`;
        tools.getElement<HTMLElement>("cropResult").classList.remove("hidden");
      }, "image/png");
    }

    function reset(): void {
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      croppedBlob = null;
      tools.getElement<HTMLElement>("cropEditor").classList.add("hidden");
      tools.getElement<HTMLElement>("cropResult").classList.add("hidden");
    }
  }

  runtime.initCrop = initCrop;
})();
