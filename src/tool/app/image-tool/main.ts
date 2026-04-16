document.addEventListener("DOMContentLoaded", () => {
  const runtime = window.ImageTool;

  if (!runtime?.initConvert || !runtime.initCompress || !runtime.initResize || !runtime.initCrop || !runtime.initBase64) {
    throw new Error("Image tool runtime failed to initialize");
  }

  runtime.initConvert();
  runtime.initCompress();
  runtime.initResize();
  runtime.initCrop();
  runtime.initBase64();
});
