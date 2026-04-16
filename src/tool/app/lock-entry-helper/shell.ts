document.addEventListener("DOMContentLoaded", () => {
  const downloadLink = document.querySelector<HTMLAnchorElement>('a[download]');
  const readmeLink = document.querySelector<HTMLAnchorElement>('a[target="_blank"]');

  downloadLink?.addEventListener("click", () => {
    const originalText = downloadLink.textContent || "下载";
    downloadLink.textContent = "已触发下载";
    window.setTimeout(() => {
      downloadLink.textContent = originalText;
    }, 1500);
  });

  readmeLink?.addEventListener("click", () => {
    readmeLink.dataset.opened = "true";
  });
});
