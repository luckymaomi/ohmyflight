(function () {
    const runtime = window.ProofKing || (window.ProofKing = {});

    type ReviewItem = {
        id: string;
        kind: "source" | "addition";
        row: ProofKingCompareRow;
        index: number;
    };

    function getElement<T extends HTMLElement>(id: string): T {
        const element = document.getElementById(id);
        if (!element) throw new Error(`Missing element: ${id}`);
        return element as T;
    }

    function render(state: ProofKingState): void {
        renderMessage(state);
        renderDocumentStatus(state);
        renderSummary(state.result);
        renderReviewWorkspace(state);
    }

    function renderMessage(state: ProofKingState): void {
        const alert = getElement<HTMLElement>("proofMessage");
        alert.className = `alert py-2 mb-3 alert-${state.messageType === "error" ? "danger" : state.messageType === "success" ? "success" : "secondary"}`;
        alert.textContent = state.message || "上传基准手册 A 和待校对手册 B 后开始比对。";
    }

    function renderDocumentStatus(state: ProofKingState): void {
        getElement<HTMLElement>("sourceStatus").textContent = describeDocument(state.sourceDocument);
        getElement<HTMLElement>("targetStatus").textContent = describeDocument(state.targetDocument);
    }

    function describeDocument(documentItem: ProofKingDocument | null): string {
        if (!documentItem) return "未上传";
        const pageText = documentItem.type === "pdf" ? ` / ${documentItem.pageCount || 0} 页` : "";
        return `${documentItem.name} / ${documentItem.units.length} 个文本单元${pageText}`;
    }

    function renderSummary(result: ProofKingCompareResult | null): void {
        const container = getElement<HTMLElement>("summaryGrid");
        getElement<HTMLButtonElement>("exportBtn").disabled = !result;
        if (!result) {
            container.innerHTML = "";
            return;
        }
        const summary = result.summary;
        const cards = [
            ["A覆盖率", runtime.ExcelExport.formatPercent(summary.coverageRate)],
            ["一致", String(summary.same)],
            ["修改", String(summary.modified)],
            ["删除", String(summary.deleted)],
            ["B新增", String(summary.added)],
            ["疑似冲突", String(summary.conflicts)]
        ];
        container.innerHTML = cards.map(([label, value]) => `
            <div class="summary-item">
                <div class="summary-label">${escapeHtml(label)}</div>
                <div class="summary-value">${escapeHtml(value)}</div>
            </div>
        `).join("");
    }

    function renderReviewWorkspace(state: ProofKingState): void {
        const list = getElement<HTMLElement>("reviewList");
        const detail = getElement<HTMLElement>("reviewDetail");
        if (!state.result) {
            list.innerHTML = `<div class="text-muted text-center py-4">暂无比对结果。</div>`;
            detail.innerHTML = `<div class="preview-empty">选择一条差异后查看完整上下文。</div>`;
            return;
        }
        const items = getReviewItems(state.result);
        if (!items.length) {
            list.innerHTML = `<div class="text-muted text-center py-4">没有需要重点复核的差异。</div>`;
            detail.innerHTML = `<div class="preview-empty">没有需要重点复核的差异。</div>`;
            return;
        }
        const selected = findReviewItem(items, state.selectedReviewId) || items[0];
        list.innerHTML = items.map((item) => renderReviewCard(item, item.id === selected.id)).join("");
        detail.innerHTML = renderReviewDetail(selected, state.result);
    }

    function getReviewItems(result: ProofKingCompareResult): ReviewItem[] {
        const sourceRows = result.rows
            .filter((row) => row.status !== "same")
            .map((row, index) => ({ id: `source:${row.id}`, kind: "source" as const, row, index: index + 1 }));
        const additions = result.additions
            .map((row, index) => ({ id: `addition:${row.id}`, kind: "addition" as const, row, index: index + 1 }));
        return [...sourceRows, ...additions].slice(0, 400);
    }

    function findReviewItem(items: ReviewItem[], id: string): ReviewItem | null {
        return items.find((item) => item.id === id) || null;
    }

    function getFirstReviewId(result: ProofKingCompareResult | null): string {
        if (!result) return "";
        return getReviewItems(result)[0]?.id || "";
    }

    function getSelectedRow(state: ProofKingState): ProofKingCompareRow | null {
        if (!state.result) return null;
        const item = findReviewItem(getReviewItems(state.result), state.selectedReviewId) || getReviewItems(state.result)[0];
        return item?.row || null;
    }

    function renderReviewCard(item: ReviewItem, active: boolean): string {
        const status = item.kind === "addition" ? "B新增" : runtime.CompareModel.statusText(item.row.status);
        const statusClass = item.kind === "addition" ? "status-added" : `status-${item.row.status}`;
        const location = runtime.Normalizer.locationOf(item.row.source);
        const text = item.row.source.text;
        return `
            <button class="review-card${active ? " active" : ""}" data-review-id="${escapeHtml(item.id)}" type="button">
                <div class="review-card-head">
                    <span class="status-pill ${escapeHtml(statusClass)}">${escapeHtml(status)}</span>
                    <span class="review-card-title">${escapeHtml(location)}</span>
                    <span class="text-muted small">${escapeHtml(runtime.ExcelExport.formatPercent(item.row.similarity))}</span>
                </div>
                <div class="review-card-meta">
                    <span>${escapeHtml(item.row.reason)}</span>
                    ${item.row.missingTokens.length || item.row.extraTokens.length ? `<span>关键项变化</span>` : ""}
                </div>
                <div class="review-card-snippet">${escapeHtml(text)}</div>
            </button>
        `;
    }

    function renderReviewDetail(item: ReviewItem, result: ProofKingCompareResult): string {
        const row = item.row;
        const sourceLabel = item.kind === "addition" ? "B 新增原文" : "A 基准原文";
        const targetLabel = item.kind === "addition" ? "A 候选上下文" : "B 候选上下文";
        const sourceDocument = item.kind === "addition" ? result.targetDocument : result.sourceDocument;
        const targetDocument = item.kind === "addition" ? result.sourceDocument : result.targetDocument;
        const sourceContext = buildUnitContext(sourceDocument, row.source);
        const targetContext = row.target?.windowText || "";
        const title = item.kind === "addition" ? "B 新增内容" : runtime.CompareModel.statusText(row.status);
        return `
            <div class="detail-head">
                <div>
                    <div class="detail-title">${escapeHtml(title)} / ${escapeHtml(runtime.ExcelExport.formatPercent(row.similarity))}</div>
                    <div class="text-muted small">${escapeHtml(row.reason)}</div>
                </div>
                <span class="status-pill ${item.kind === "addition" ? "status-added" : `status-${escapeHtml(row.status)}`}">${escapeHtml(title)}</span>
            </div>
            <div class="compare-grid">
                <section class="compare-pane">
                    <div class="compare-pane-title">
                        <span>${escapeHtml(sourceLabel)}</span>
                        <span>${escapeHtml(runtime.Normalizer.locationOf(row.source))}</span>
                    </div>
                    <div class="compare-text">${highlightSourceContext(sourceContext, row, item.kind)}</div>
                </section>
                <section class="compare-pane">
                    <div class="compare-pane-title">
                        <span>${escapeHtml(targetLabel)}</span>
                        <span>${escapeHtml(row.target?.windowLocation || "未找到可靠对应")}</span>
                    </div>
                    <div class="compare-text">${highlightTargetContext(targetContext, row, item.kind, targetDocument)}</div>
                </section>
            </div>
            <div id="pdfPreview" class="pdf-preview-panel">
                <div class="preview-empty">PDF 页面预览加载中。</div>
            </div>
        `;
    }

    function buildUnitContext(documentItem: ProofKingDocument, segment: ProofKingSegment): string {
        const units = documentItem.units || [];
        const index = units.findIndex((unit) => unit.id === segment.unitId);
        if (index < 0) return segment.text;
        const start = Math.max(0, index - 2);
        const end = Math.min(units.length - 1, index + 2);
        return units.slice(start, end + 1).map((unit) => unit.text).join("\n\n");
    }

    function highlightSourceContext(contextText: string, row: ProofKingCompareRow, kind: "source" | "addition"): string {
        const className = kind === "addition" ? "mark-added" : row.status === "deleted" ? "mark-deleted" : "mark-focus";
        const focused = markPhrase(contextText, row.source.text, className);
        return highlightTokens(focused, row.missingTokens, "mark-token-missing");
    }

    function highlightTargetContext(contextText: string, row: ProofKingCompareRow, kind: "source" | "addition", targetDocument: ProofKingDocument): string {
        if (!contextText) {
            return `<span class="text-muted">未找到可靠对应。</span>`;
        }
        const targetText = row.target?.segment.text || "";
        const className = kind === "addition" ? "mark-focus" : "mark-added";
        const focused = markPhrase(contextText, targetText, className);
        return highlightTokens(focused, row.extraTokens, "mark-token-extra");
    }

    function markPhrase(sourceText: string, phrase: string, className: string): string {
        const escaped = escapeHtml(sourceText);
        if (!phrase) return escaped;
        const index = sourceText.indexOf(phrase);
        if (index < 0) return escaped;
        const before = escapeHtml(sourceText.slice(0, index));
        const hit = escapeHtml(sourceText.slice(index, index + phrase.length));
        const after = escapeHtml(sourceText.slice(index + phrase.length));
        return `${before}<mark class="${className}">${hit}</mark>${after}`;
    }

    function highlightTokens(html: string, tokens: string[], className: string): string {
        return (tokens || [])
            .filter((token) => token && token.length >= 2)
            .slice(0, 16)
            .reduce((current, token) => {
                const escapedToken = escapeHtml(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return current.replace(new RegExp(escapedToken, "g"), (match) => `<mark class="${className}">${match}</mark>`);
            }, html);
    }

    function escapeHtml(value: unknown): string {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    runtime.View = {
        render,
        getElement,
        getReviewItems,
        getFirstReviewId,
        getSelectedRow,
        escapeHtml
    };
})();
