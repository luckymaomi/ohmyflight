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
            if (!keyword.source || keyword.source.blockId !== blockId) return;
            const start = Number(keyword.source.start);
            const end = Number(keyword.source.end);
            if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > text.length || end <= start) return;
            ranges.push({
                keywordId: keyword.id,
                color: keyword.color,
                start,
                end
            });
        });
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
        return `<mark class="ak-highlight" data-keyword-ids="${escapeHtml(segment.keywordIds.join(" "))}" style="${style}">${escapeHtml(segment.text)}</mark>`;
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
            return `<p id="checklist-block-${escapeHtml(block.id)}" class="${active}" data-block-id="${escapeHtml(block.id)}" data-block-index="${block.blockIndex}">${renderHighlightedText(block.text, ranges)}</p>`;
        }).join("");
    }

    function focusChecklistHighlight(state: AuditKingStateModel): void {
        const container = getElement<HTMLElement>("checklistText");
        if (!state.currentKeywordId || state.currentKeywordId === "all") return;
        const activeBlock = container.querySelector<HTMLElement>(".active-source");
        const highlight = findKeywordHighlight(activeBlock || container, state.currentKeywordId)
            || findKeywordHighlight(container, state.currentKeywordId);
        scrollChildIntoPanel(container, highlight || activeBlock);
    }

    function findKeywordHighlight(root: ParentNode, keywordId: string): HTMLElement | null {
        const highlights = Array.from(root.querySelectorAll<HTMLElement>(".ak-highlight"));
        return highlights.find((element) => (element.dataset.keywordIds || "").split(/\s+/).includes(keywordId)) || null;
    }

    function renderDocuments(state: AuditKingStateModel): void {
        const list = getElement<HTMLElement>("manualList");
        const filter = getElement<HTMLSelectElement>("manualFilter");
        if (!state.documents.length) {
            list.innerHTML = `<div class="empty-panel">尚未上传手册。</div>`;
            filter.innerHTML = `<option value="all">全部手册</option>`;
            return;
        }

        const enabledDocuments = state.documents.filter((documentItem) => documentItem.enabled !== false);
        list.innerHTML = state.documents.map((documentItem) => `
            <div class="manual-chip ${documentItem.enabled === false ? "muted" : ""}">
                <span class="manual-name">${escapeHtml(documentItem.name)}</span>
                <span class="manual-actions">
                    <small>${documentItem.blocks.length} 段${documentItem.enabled === false ? " / 已停用" : ""}</small>
                    <button class="manual-toggle" data-action="toggle-document" data-document-id="${escapeHtml(documentItem.id)}">${documentItem.enabled === false ? "启用" : "停用"}</button>
                    <button class="manual-delete" data-action="remove-document" data-document-id="${escapeHtml(documentItem.id)}">删除</button>
                </span>
            </div>
        `).join("");
        filter.innerHTML = [
            `<option value="all">全部手册</option>`,
            ...enabledDocuments.map((documentItem) => `<option value="${escapeHtml(documentItem.id)}">${escapeHtml(documentItem.name)}</option>`)
        ].join("");
        filter.value = enabledDocuments.some((documentItem) => documentItem.id === state.documentFilterId)
            ? state.documentFilterId
            : "all";
    }

    function renderKeywords(state: AuditKingStateModel): void {
        const container = getElement<HTMLElement>("keywordList");
        if (!state.keywords.length) {
            container.innerHTML = `<div class="empty-panel">从检查单选中文字，或手动输入关键词。</div>`;
            return;
        }

        container.innerHTML = state.keywords.map((keyword, index) => {
            const count = state.searchResult.countsByKeyword[keyword.id] ?? 0;
            const active = state.currentKeywordId === keyword.id ? "active" : "";
            const disabled = keyword.enabled === false ? "muted" : "";
            const sourceStatus = getKeywordSourceStatus(keyword, state.checklistBlocks);
            const evidenceCount = (keyword.evidences || []).length;
            return `
                <div class="keyword-item ${active} ${disabled}" data-keyword-id="${escapeHtml(keyword.id)}">
                    <input class="form-control form-control-sm keyword-order-input" type="number" min="1" value="${index + 1}" data-action="edit-keyword-order" data-keyword-id="${escapeHtml(keyword.id)}" aria-label="关键词序号">
                    <button class="keyword-select" data-action="select-keyword" data-keyword-id="${escapeHtml(keyword.id)}">
                        <span class="keyword-color" style="background:${escapeHtml(keyword.color)}"></span>
                        <span class="keyword-main">
                            <span class="keyword-text">${escapeHtml(keyword.text)}</span>
                            <span class="keyword-source-status ${sourceStatus.className}">${sourceStatus.label}</span>
                            <span class="keyword-evidence-status">${evidenceCount} 条证据</span>
                        </span>
                        <span class="keyword-count">${count}</span>
                    </button>
                    <input class="form-control form-control-sm keyword-label-input" value="${escapeHtml(keyword.label || "")}" placeholder="条款标记" data-action="edit-keyword-label" data-keyword-id="${escapeHtml(keyword.id)}" aria-label="关键词标记">
                    <button class="keyword-toggle" data-action="toggle-keyword" data-keyword-id="${escapeHtml(keyword.id)}">${keyword.enabled === false ? "启用" : "停用"}</button>
                    <button class="keyword-delete" data-action="delete-keyword" data-keyword-id="${escapeHtml(keyword.id)}">×</button>
                </div>
            `;
        }).join("");
    }

    function getKeywordSourceStatus(keyword: AuditKingKeyword, blocks: AuditKingTextBlock[]): { label: string; className: string } {
        if (!keyword.source) {
            return { label: "无来源", className: "" };
        }
        const block = keyword.source.blockId
            ? blocks.find((item) => item.id === keyword.source?.blockId)
            : undefined;
        const start = Number(keyword.source.start);
        const end = Number(keyword.source.end);
        const hasValidRange = !!block && Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && end <= block.text.length;
        const textOk = !keyword.source.text || (hasValidRange && block?.text.slice(start, end) === keyword.source.text);
        if (hasValidRange && textOk) {
            return { label: "已定位", className: "located" };
        }
        return { label: "需人工确认", className: "review" };
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
            const canBindEvidence = state.currentKeywordId !== "all" && match.keywordId === state.currentKeywordId;
            const boundEvidence = canBindEvidence ? findManualEvidenceForMatch(state, match) : null;
            const evidenceAction = boundEvidence
                ? `<button class="btn btn-sm btn-outline-danger match-evidence-action" data-action="unbind-match-evidence" data-match-index="${index}">解绑当前关键词</button>`
                : `<button class="btn btn-sm btn-outline-primary match-evidence-action" data-action="bind-match-evidence" data-match-index="${index}">绑定当前关键词</button>`;
            return `
                <article class="match-item ${active}" id="match-${index}" data-action="focus-match" data-match-index="${index}" role="button" tabindex="0">
                    <div class="match-meta">
                        <strong>${escapeHtml(match.keywordText)}</strong>
                        <span>${escapeHtml(match.documentName)} / 第 ${match.blockIndex} 段${escapeHtml(title)}</span>
                        <span class="match-mode">${match.mode === "exact" ? "精确" : "宽松"}</span>
                        ${canBindEvidence ? evidenceAction : ""}
                    </div>
                    <div class="match-context">${context.truncatedStart ? "..." : ""}${renderHighlightedText(context.text, [contextRange])}${context.truncatedEnd ? "..." : ""}</div>
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
        const detailContextLength = state.currentDetailContextLength || 2000;
        const context = runtime.Highlight.buildBlockWindowContext(documentItem?.blocks || [], {
            blockId: match.blockId,
            matchStart: match.start,
            matchEnd: match.end,
            targetLength: detailContextLength
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
            ${context.truncatedStart || context.truncatedEnd ? `<button class="btn btn-sm btn-outline-secondary mt-2" data-action="expand-match-detail">查看更多上下文</button>` : ""}
        `;
        scrollChildIntoPanel(container, container.querySelector<HTMLElement>(".ak-highlight"));
    }

    function findManualEvidenceForMatch(state: AuditKingStateModel, match: AuditKingMatch): AuditKingManualEvidence | null {
        const keyword = state.keywords?.find((item) => item.id === state.currentKeywordId);
        if (!keyword) return null;
        return (keyword.evidences || []).find((evidence) => (
            evidence.documentName === match.documentName
            && evidence.blockId === match.blockId
            && Number(evidence.start) === match.start
            && Number(evidence.end) === match.end
            && evidence.text === match.blockText.slice(match.start, match.end)
        )) || null;
    }

    function scrollChildIntoPanel(container: HTMLElement, child: HTMLElement | null): void {
        if (!child) return;
        const targetTop = child.offsetTop - container.clientHeight * 0.35;
        container.scrollTop = Math.max(0, targetTop);
    }

    function renderEvidence(state: AuditKingStateModel): void {
        const container = getElement<HTMLElement>("evidenceList");
        const entryCount = state.evidenceGroups.reduce((total, group) => total + group.items.length, 0);
        getElement<HTMLElement>("evidenceCount").textContent = `${state.evidenceGroups.length} 个条款 / ${entryCount} 条依据`;
        if (!state.evidenceGroups.length) {
            container.innerHTML = `<div class="empty-panel">人工选中的依据会放在这里。</div>`;
            return;
        }
        container.innerHTML = state.evidenceGroups.map((group, groupIndex) => `
            <section class="audit-clause">
                <div class="row g-2 align-items-center audit-clause-head">
                    <div class="col-auto">
                        <input class="form-control form-control-sm evidence-order-input" type="number" min="1" value="${groupIndex + 1}" data-action="edit-evidence-group-order" data-group-index="${groupIndex}" aria-label="条款序号">
                    </div>
                    <div class="col">
                        <input class="form-control form-control-sm fw-semibold" value="${escapeHtml(group.title)}" data-action="edit-evidence-group-title" data-group-index="${groupIndex}" aria-label="条款名称">
                    </div>
                    <div class="col-auto">
                        <span class="text-muted small">${group.items.length} 条依据</span>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-sm btn-outline-primary" data-action="add-evidence-entry" data-group-index="${groupIndex}">新增依据</button>
                    </div>
                    <div class="col-auto">
                        <button class="btn btn-sm btn-outline-danger" data-action="remove-evidence-group" data-group-index="${groupIndex}">删除条款</button>
                    </div>
                </div>
                ${group.items.length ? group.items.map((item, itemIndex) => `
                    <div class="audit-evidence-row">
                        <div class="mb-2">
                            <label class="form-label small text-muted mb-1">依据内容</label>
                            <textarea class="form-control form-control-sm audit-evidence-content" rows="2" data-action="edit-evidence-content" data-group-index="${groupIndex}" data-item-index="${itemIndex}" aria-label="依据内容">${escapeHtml(item.content)}</textarea>
                        </div>
                        <div class="row g-2 align-items-center">
                            <div class="col">
                                <label class="form-label small text-muted mb-1">备注</label>
                                <input class="form-control form-control-sm" value="${escapeHtml(item.note)}" placeholder="备注" data-action="edit-evidence-note" data-group-index="${groupIndex}" data-item-index="${itemIndex}" aria-label="备注">
                            </div>
                            <div class="col-auto align-self-end">
                                <button class="btn btn-sm btn-outline-danger" data-action="remove-evidence" data-group-index="${groupIndex}" data-item-index="${itemIndex}">删除</button>
                            </div>
                        </div>
                    </div>
                `).join("") : `<div class="audit-clause-empty">暂无依据，点击“新增依据”添加一行。</div>`}
            </section>
        `).join("");
    }

    function getManualEvidenceStatus(evidence: AuditKingManualEvidence, documents: AuditKingDocument[]): { label: string; className: string } {
        const documentBlocks = documents.flatMap((documentItem) => documentItem.blocks);
        const block = evidence.blockId
            ? documentBlocks.find((item) => item.id === evidence.blockId)
            : undefined;
        const start = Number(evidence.start);
        const end = Number(evidence.end);
        const hasValidRange = !!block && Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && end <= block.text.length;
        const textOk = !evidence.text || (hasValidRange && block?.text.slice(start, end) === evidence.text);
        if (hasValidRange && textOk) {
            return { label: "已定位", className: "located" };
        }
        return { label: "需人工确认", className: "review" };
    }

    function renderKeywordEvidences(state: AuditKingStateModel): void {
        const container = getElement<HTMLElement>("keywordEvidenceList");
        const countElement = getElement<HTMLElement>("keywordEvidenceCount");
        const keyword = state.keywords.find((item) => item.id === state.currentKeywordId);
        if (!keyword || state.currentKeywordId === "all") {
            countElement.textContent = "未选择关键词";
            container.innerHTML = `<div class="empty-panel">先在关键词池选择一个关键词，再绑定手册证据。</div>`;
            return;
        }
        const evidences = keyword.evidences || [];
        countElement.textContent = `${evidences.length} 条手册证据`;
        if (!evidences.length) {
            container.innerHTML = `<div class="empty-panel">当前关键词还没有绑定手册证据。</div>`;
            return;
        }
        container.innerHTML = evidences.map((evidence, index) => {
            const title = evidence.title ? ` / ${evidence.title}` : "";
            const status = getManualEvidenceStatus(evidence, state.documents || []);
            return `
                <article class="manual-evidence-item">
                    <div class="manual-evidence-head">
                        <strong>${escapeHtml(evidence.documentName)} / 第 ${escapeHtml(evidence.blockIndex ?? "")} 段${escapeHtml(title)}</strong>
                        <span class="keyword-source-status ${status.className}">${status.label}</span>
                    </div>
                    <div class="manual-evidence-text">${escapeHtml(evidence.text)}</div>
                    ${evidence.note ? `<div class="manual-evidence-note">${escapeHtml(evidence.note)}</div>` : ""}
                    <button class="btn btn-sm btn-outline-danger" data-action="remove-manual-evidence" data-evidence-id="${escapeHtml(evidence.id || "")}">解绑</button>
                </article>
            `;
        }).join("");
    }

    function scrollEvidenceToBottom(): void {
        const container = getElement<HTMLElement>("evidenceList");
        container.scrollTop = container.scrollHeight;
    }

    function renderAll(state: AuditKingStateModel): void {
        renderChecklist(state);
        renderDocuments(state);
        renderKeywords(state);
        renderMatches(state);
        renderKeywordEvidences(state);
        renderEvidence(state);
    }

    runtime.View = {
        escapeHtml,
        getElement,
        renderStatus,
        renderHighlightedText,
        renderAll,
        renderChecklist,
        focusChecklistHighlight,
        renderDocuments,
        renderKeywords,
        renderMatches,
        renderMatchDetail,
        renderKeywordEvidences,
        renderEvidence,
        scrollEvidenceToBottom
    };
})();
