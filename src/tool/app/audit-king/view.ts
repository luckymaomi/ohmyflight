(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function escapeHtml(value: unknown): string {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getElement<T extends HTMLElement>(id: string): T {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`页面缺少必要元素：${id}`);
        }
        return element as T;
    }

    function renderStatus(message: string, type: "info" | "success" | "error" = "info"): void {
        const element = getElement<HTMLElement>("statusBar");
        element.textContent = message;
        element.className = `status-bar ${type}`;
    }

    function keywordRangesForText(text: string, blockId: string, state: AuditKingStateModel): AuditKingHighlightRange[] {
        const ranges: AuditKingHighlightRange[] = [];
        state.keywords.filter((keyword) => keyword.enabled !== false).forEach((keyword) => {
            if (!keyword.text) return;
            let start = text.indexOf(keyword.text);
            while (start >= 0) {
                ranges.push({
                    keywordId: keyword.id,
                    color: keyword.color,
                    start,
                    end: start + keyword.text.length
                });
                start = text.indexOf(keyword.text, start + Math.max(1, keyword.text.length));
            }
        });
        const currentKeyword = state.keywords.find((keyword) => keyword.id === state.currentKeywordId);
        if (currentKeyword?.source?.blockId === blockId) {
            ranges.push({
                keywordId: currentKeyword.id,
                color: currentKeyword.color,
                start: currentKeyword.source.start,
                end: currentKeyword.source.end
            });
        }
        return ranges;
    }

    function segmentToHtml(segment: { text: string; keywordIds: string[]; colors: string[] }): string {
        if (!segment.keywordIds.length) {
            return escapeHtml(segment.text);
        }
        const background = segment.colors[segment.colors.length - 1];
        const shadows = segment.colors
            .slice(0, -1)
            .map((color, index) => `inset 0 -${3 + index * 3}px 0 ${color}`)
            .join(", ");
        const style = [
            `background:${background}33`,
            `border-bottom:2px solid ${background}`,
            shadows ? `box-shadow:${shadows}` : ""
        ].filter(Boolean).join(";");
        return `<mark class="ak-highlight" style="${style}">${escapeHtml(segment.text)}</mark>`;
    }

    function renderHighlightedText(text: string, ranges: AuditKingHighlightRange[]): string {
        return runtime.Highlight.buildHighlightSegments(text, ranges)
            .map(segmentToHtml)
            .join("");
    }

    function renderChecklist(state: AuditKingStateModel): void {
        const container = getElement<HTMLElement>("checklistText");
        if (!state.checklistBlocks.length) {
            container.innerHTML = `<div class="empty-panel">上传检查单后，这里只显示参考文本。不会自动拆条款，也不会自动提取关键词。</div>`;
            return;
        }

        container.innerHTML = state.checklistBlocks.map((block) => {
            const ranges = keywordRangesForText(block.text, block.id, state);
            const currentKeyword = state.keywords.find((keyword) => keyword.id === state.currentKeywordId);
            const active = currentKeyword?.source?.blockId === block.id ? " active-source" : "";
            return `<p id="checklist-block-${escapeHtml(block.id)}" class="${active}" data-block-id="${escapeHtml(block.id)}">${renderHighlightedText(block.text, ranges)}</p>`;
        }).join("");
    }

    function renderDocuments(state: AuditKingStateModel): void {
        const list = getElement<HTMLElement>("manualList");
        const filter = getElement<HTMLSelectElement>("manualFilter");
        if (!state.documents.length) {
            list.innerHTML = `<div class="empty-panel">尚未上传手册。</div>`;
            filter.innerHTML = `<option value="all">全部手册</option>`;
            return;
        }

        list.innerHTML = state.documents.map((documentItem) => `
            <div class="manual-chip">
                <span class="manual-name">${escapeHtml(documentItem.name)}</span>
                <span class="manual-actions">
                    <small>${documentItem.blocks.length} 段</small>
                    <button class="manual-delete" data-action="remove-document" data-document-id="${escapeHtml(documentItem.id)}">删除</button>
                </span>
            </div>
        `).join("");
        filter.innerHTML = [
            `<option value="all">全部手册</option>`,
            ...state.documents.map((documentItem) => `<option value="${escapeHtml(documentItem.id)}">${escapeHtml(documentItem.name)}</option>`)
        ].join("");
        filter.value = state.documentFilterId;
    }

    function renderKeywords(state: AuditKingStateModel): void {
        const container = getElement<HTMLElement>("keywordList");
        if (!state.keywords.length) {
            container.innerHTML = `<div class="empty-panel">从检查单选中文字，或手动输入关键词。</div>`;
            return;
        }

        container.innerHTML = state.keywords.map((keyword) => {
            const count = state.searchResult.countsByKeyword[keyword.id] ?? 0;
            const active = state.currentKeywordId === keyword.id ? "active" : "";
            const disabled = keyword.enabled === false ? "muted" : "";
            return `
                <div class="keyword-item ${active} ${disabled}" data-keyword-id="${escapeHtml(keyword.id)}">
                    <button class="keyword-select" data-action="select-keyword" data-keyword-id="${escapeHtml(keyword.id)}">
                        <span class="keyword-color" style="background:${escapeHtml(keyword.color)}"></span>
                        <span class="keyword-text">${escapeHtml(keyword.text)}</span>
                        <span class="keyword-count">${count}</span>
                    </button>
                    <button class="keyword-toggle" data-action="toggle-keyword" data-keyword-id="${escapeHtml(keyword.id)}">${keyword.enabled === false ? "启用" : "停用"}</button>
                    <button class="keyword-delete" data-action="delete-keyword" data-keyword-id="${escapeHtml(keyword.id)}">×</button>
                </div>
            `;
        }).join("");
    }

    function renderMatches(state: AuditKingStateModel): void {
        const list = getElement<HTMLElement>("matchList");
        const filtered = runtime.SearchEngine.filterMatches(state.searchResult.matches, {
            keywordId: state.currentKeywordId,
            documentId: state.documentFilterId
        });

        getElement<HTMLElement>("matchCount").textContent = `${filtered.length} 条命中`;
        if (!filtered.length) {
            list.innerHTML = `<div class="empty-panel">当前筛选没有命中。</div>`;
            renderMatchDetail(state);
            return;
        }

        list.innerHTML = filtered.map((match: AuditKingMatch, index: number) => {
            const context = runtime.Highlight.buildContext(match.blockText, {
                start: match.start,
                end: match.end,
                before: 100,
                after: 100
            });
            const contextRange = {
                keywordId: match.keywordId,
                color: match.keywordColor,
                start: match.start - context.offset,
                end: match.end - context.offset
            };
            const active = index === state.currentMatchIndex ? "active" : "";
            const title = match.title ? ` / ${match.title}` : "";
            return `
                <article class="match-item ${active}" id="match-${index}" data-match-index="${index}">
                    <div class="match-meta">
                        <strong>${escapeHtml(match.keywordText)}</strong>
                        <span>${escapeHtml(match.documentName)} / 第 ${match.blockIndex} 段${escapeHtml(title)}</span>
                        <span class="match-mode">${match.mode === "exact" ? "精确" : "宽松"}</span>
                    </div>
                    <div class="match-context">${context.truncatedStart ? "..." : ""}${renderHighlightedText(context.text, [contextRange])}${context.truncatedEnd ? "..." : ""}</div>
                    <div class="match-actions">
                        <button class="btn btn-sm btn-outline-secondary" data-action="focus-match" data-match-index="${index}">查看详情</button>
                    </div>
                </article>
            `;
        }).join("");
        renderMatchDetail(state);
        scrollChildIntoPanel(list, list.querySelector<HTMLElement>(".match-item.active"));
    }

    function renderMatchDetail(state: AuditKingStateModel): void {
        const container = getElement<HTMLElement>("matchDetail");
        const filtered = runtime.SearchEngine.filterMatches(state.searchResult.matches, {
            keywordId: state.currentKeywordId,
            documentId: state.documentFilterId
        });
        const match = filtered[state.currentMatchIndex];
        if (!match) {
            container.innerHTML = `<div class="empty-panel">点击左侧命中摘要后，这里显示附近全文。</div>`;
            return;
        }

        const documentItem = state.documents.find((item) => item.id === match.documentId);
        const context = runtime.Highlight.buildBlockWindowContext(documentItem?.blocks || [], {
            blockId: match.blockId,
            matchStart: match.start,
            matchEnd: match.end,
            targetLength: 5000
        });
        const detailText = context.text || match.blockText;
        const rangeStart = context.text ? context.matchStart : match.start;
        const rangeEnd = context.text ? context.matchEnd : match.end;
        const title = match.title ? ` / ${match.title}` : "";
        container.innerHTML = `
            <div class="detail-meta">
                <strong>${escapeHtml(match.keywordText)}</strong>
                <span>${escapeHtml(match.documentName)} / 第 ${match.blockIndex} 段${escapeHtml(title)}</span>
                <span class="match-mode">${match.mode === "exact" ? "精确" : "宽松"}</span>
            </div>
            <div class="detail-text">
                ${context.truncatedStart ? "<p>...</p>" : ""}
                <p>${renderHighlightedText(detailText, [{
                    keywordId: match.keywordId,
                    color: match.keywordColor,
                    start: rangeStart,
                    end: rangeEnd
                }])}</p>
                ${context.truncatedEnd ? "<p>...</p>" : ""}
            </div>
        `;
        scrollChildIntoPanel(container, container.querySelector<HTMLElement>(".ak-highlight"));
    }

    function scrollChildIntoPanel(container: HTMLElement, child: HTMLElement | null): void {
        if (!child) return;
        const targetTop = child.offsetTop - container.clientHeight * 0.35;
        container.scrollTop = Math.max(0, targetTop);
    }

    function renderEvidence(state: AuditKingStateModel): void {
        const container = getElement<HTMLElement>("evidenceList");
        getElement<HTMLElement>("evidenceCount").textContent = `${state.evidenceItems.length} 条依据`;
        if (!state.evidenceItems.length) {
            container.innerHTML = `<div class="empty-panel">人工选中的依据会放在这里。</div>`;
            return;
        }
        container.innerHTML = state.evidenceItems.map((item, index) => `
            <div class="evidence-item">
                <div class="evidence-title">${escapeHtml(item.title || item.keywordText || "未命名依据")}</div>
                <div class="evidence-meta">检查单：${escapeHtml(item.checklistClause || item.title || "")}</div>
                <div class="evidence-meta">手册：${escapeHtml(item.documentName)} / ${escapeHtml(item.locationLabel)}</div>
                <div class="evidence-excerpt">${escapeHtml(item.excerpt)}</div>
                <button class="btn btn-sm btn-outline-danger" data-action="remove-evidence" data-evidence-index="${index}">删除</button>
            </div>
        `).join("");
    }

    function renderAll(state: AuditKingStateModel): void {
        renderChecklist(state);
        renderDocuments(state);
        renderKeywords(state);
        renderMatches(state);
        renderEvidence(state);
    }

    runtime.View = {
        escapeHtml,
        getElement,
        renderStatus,
        renderHighlightedText,
        renderAll,
        renderChecklist,
        renderKeywords,
        renderMatches,
        renderMatchDetail,
        renderEvidence
    };
})();
