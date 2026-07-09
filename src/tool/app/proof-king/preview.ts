(function () {
    const runtime = window.ProofKing || (window.ProofKing = {});

    async function renderPdfPreview(row: ProofKingCompareRow | null, result: ProofKingCompareResult | null, container: HTMLElement): Promise<void> {
        container.innerHTML = "";
        const pageNumber = resolvePreviewPage(row, result);
        if (!pageNumber || !result || result.targetDocument.type !== "pdf" || !result.targetDocument.pdf) {
            container.innerHTML = `<div class="preview-empty">当前差异没有可预览的 PDF 页面。</div>`;
            return;
        }
        const page = await result.targetDocument.pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
            container.innerHTML = `<div class="preview-empty">无法创建 PDF 预览画布。</div>`;
            return;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const wrapper = document.createElement("div");
        wrapper.className = "pdf-page-preview";
        const label = document.createElement("div");
        label.className = "pdf-page-label";
        label.textContent = `B 手册 PDF 第 ${pageNumber} 页`;
        wrapper.appendChild(label);
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        await page.render({ canvasContext: context, viewport }).promise;
    }

    function resolvePreviewPage(row: ProofKingCompareRow | null, result: ProofKingCompareResult | null): number | undefined {
        if (!row || !result) return undefined;
        if (row.target?.segment.documentId === result.targetDocument.id) {
            return row.target.segment.pageNumber;
        }
        if (row.source.documentId === result.targetDocument.id) {
            return row.source.pageNumber;
        }
        return undefined;
    }

    runtime.Preview = {
        renderPdfPreview,
        resolvePreviewPage
    };
})();
