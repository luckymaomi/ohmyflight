document.addEventListener("DOMContentLoaded", () => {
  const downloadLink = document.querySelector<HTMLAnchorElement>('a[download]');
  const commandBlocks = Array.from(document.querySelectorAll<HTMLElement>("pre"));

  downloadLink?.addEventListener("click", () => {
    const originalText = downloadLink.textContent || "下载";
    downloadLink.textContent = "已触发下载";
    window.setTimeout(() => {
      downloadLink.textContent = originalText;
    }, 1500);
  });

  commandBlocks.forEach((block) => {
    block.style.cursor = "pointer";
    block.title = "点击复制命令";
    block.addEventListener("click", async () => {
      const text = block.innerText.trim();
      if (!text) {
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        block.dataset.copied = "true";
        window.setTimeout(() => {
          delete block.dataset.copied;
        }, 1500);
      } catch {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(block);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.execCommand("copy");
        selection?.removeAllRanges();
      }
    });
  });
});
