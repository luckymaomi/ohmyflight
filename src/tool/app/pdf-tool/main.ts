const { PDFDocument } = PDFLib;

document.addEventListener("DOMContentLoaded", () => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "../../../libs/pdf.worker.min.js";

  const runtime = window.PdfTool;
  if (!runtime?.initExtract || !runtime.initMerge || !runtime.initPdfToImage || !runtime.initImageToPdf) {
    throw new Error("PDF tool runtime failed to initialize");
  }

  runtime.initExtract();
  runtime.initMerge();
  runtime.initPdfToImage();
  runtime.initImageToPdf();
});
