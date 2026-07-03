(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});
    const state: AuditKingStateModel = runtime.State.createState();

    function getElement<T extends HTMLElement>(id: string): T {
        return runtime.View.getElement(id) as T;
    }

    function recomputeSearch(): void {
        const result = state.documentIndex
            ? runtime.SearchEngine.searchIndex(state.documentIndex, state.keywords)
            : runtime.SearchEngine.searchDocuments(state.documents, state.keywords);
        runtime.State.setSearchResult(state, result);
    }

    function refresh(message = "", type: "info" | "success" | "error" = "info"): void {
        runtime.View.renderAll(state);
        if (message) {
            runtime.View.renderStatus(message, type);
        }
    }

    async function handleChecklistFile(file: File): Promise<void> {
        try {
            runtime.View.renderStatus(`正在读取检查单：${file.name}`, "info");
            const documentItem = await runtime.DocumentReader.readDocxFile(file, 0);
            runtime.State.setChecklistBlocks(state, documentItem.blocks);
            refresh(`检查单已读取：${file.name}（${documentItem.blocks.length} 段）。不会自动提取关键词。`, "success");
        } catch (error) {
            runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
        }
    }

    async function handleManualFiles(files: File[]): Promise<void> {
        try {
            runtime.View.renderStatus(`正在读取 ${files.length} 本手册...`, "info");
            const documents: AuditKingDocument[] = [];
            for (let index = 0; index < files.length; index += 1) {
                documents.push(await runtime.DocumentReader.readDocxFile(files[index], state.documents.length + index));
            }
            runtime.State.appendDocuments(state, documents);
            recomputeSearch();
            refresh(`已追加 ${documents.length} 本手册，共 ${state.documents.length} 本。`, "success");
        } catch (error) {
            runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
        }
    }

    function addKeyword(text: string, source?: AuditKingKeywordSource): void {
        try {
            runtime.State.addKeyword(state, text, source);
            recomputeSearch();
            refresh(`已加入关键词：${text}`, "success");
        } catch (error) {
            runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
        }
    }

    function getFilteredMatches(): AuditKingMatch[] {
        return runtime.SearchEngine.filterMatches(state.searchResult.matches, {
            keywordId: state.currentKeywordId,
            documentId: state.documentFilterId
        });
    }

    function focusMatch(index: number): void {
        const matches = getFilteredMatches();
        if (!matches.length) return;
        state.currentMatchIndex = Math.max(0, Math.min(matches.length - 1, index));
        runtime.View.renderMatches(state);
    }

    function bindUploads(): void {
        const checklistInput = getElement<HTMLInputElement>("checklistInput");
        const manualInput = getElement<HTMLInputElement>("manualInput");

        checklistInput.addEventListener("change", () => {
            const file = checklistInput.files?.[0];
            checklistInput.value = "";
            if (file) void handleChecklistFile(file);
        });

        manualInput.addEventListener("change", () => {
            const files = Array.from(manualInput.files || []);
            manualInput.value = "";
            if (files.length) void handleManualFiles(files);
        });
    }

    function bindKeywordActions(): void {
        getElement<HTMLButtonElement>("addSelectedKeywordBtn").addEventListener("click", () => {
            const selection = getChecklistSelection();
            addKeyword(selection.text, selection.source);
        });
        getElement<HTMLButtonElement>("setEvidenceTitleBtn").addEventListener("click", () => {
            const selection = getChecklistSelection();
            if (!selection.text) {
                runtime.View.renderStatus("请先在检查单中选中对应条款。", "error");
                return;
            }
            getElement<HTMLInputElement>("evidenceTitleInput").value = selection.text;
            renderEvidenceDraft();
            runtime.View.renderStatus("已设置依据名称/检查单条款。", "success");
        });
        getElement<HTMLInputElement>("evidenceTitleInput").addEventListener("input", () => {
            renderEvidenceDraft();
        });

        getElement<HTMLButtonElement>("addKeywordBtn").addEventListener("click", () => {
            const input = getElement<HTMLInputElement>("keywordInput");
            addKeyword(input.value);
            input.value = "";
        });

        getElement<HTMLInputElement>("keywordInput").addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const input = event.currentTarget as HTMLInputElement;
            addKeyword(input.value);
            input.value = "";
        });
    }

    function getChecklistSelection(): { text: string; source?: AuditKingKeywordSource } {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || "";
        if (!selection || !text || selection.rangeCount === 0) {
            return { text };
        }

        const range = selection.getRangeAt(0);
        const startElement = range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startContainer.parentElement
            : range.startContainer as Element;
        const endElement = range.endContainer.nodeType === Node.TEXT_NODE
            ? range.endContainer.parentElement
            : range.endContainer as Element;
        const startBlock = startElement?.closest<HTMLElement>("[data-block-id]");
        const endBlock = endElement?.closest<HTMLElement>("[data-block-id]");
        if (!startBlock || !endBlock || startBlock !== endBlock) {
            return { text };
        }

        const sourceRange = document.createRange();
        sourceRange.selectNodeContents(startBlock);
        sourceRange.setEnd(range.startContainer, range.startOffset);
        const start = sourceRange.toString().length;
        sourceRange.setEnd(range.endContainer, range.endOffset);
        const end = sourceRange.toString().length;
        sourceRange.detach();

        return {
            text,
            source: {
                blockId: startBlock.dataset.blockId || "",
                start,
                end
            }
        };
    }

    function scrollChecklistSource(keywordId: string): void {
        const keyword = state.keywords.find((item) => item.id === keywordId);
        if (!keyword?.source?.blockId) return;
        runtime.View.renderChecklist(state);
        document.getElementById(`checklist-block-${keyword.source.blockId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    function bindFiltersAndNavigation(): void {
        getElement<HTMLSelectElement>("manualFilter").addEventListener("change", (event: Event) => {
            runtime.State.setDocumentFilter(state, (event.currentTarget as HTMLSelectElement).value);
            runtime.View.renderMatches(state);
        });
        getElement<HTMLButtonElement>("showAllKeywordsBtn").addEventListener("click", () => {
            runtime.State.setCurrentKeyword(state, "all");
            runtime.View.renderKeywords(state);
            runtime.View.renderMatches(state);
        });
        getElement<HTMLButtonElement>("prevMatchBtn").addEventListener("click", () => {
            focusMatch(state.currentMatchIndex - 1);
        });
        getElement<HTMLButtonElement>("nextMatchBtn").addEventListener("click", () => {
            focusMatch(state.currentMatchIndex + 1);
        });
    }

    function bindDelegatedActions(): void {
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const actionTarget = target.closest<HTMLElement>("[data-action]");
            if (!actionTarget) return;
            const action = actionTarget.dataset.action;
            if (action === "select-keyword") {
                const keywordId = actionTarget.dataset.keywordId || "all";
                runtime.State.setCurrentKeyword(state, keywordId);
                runtime.View.renderKeywords(state);
                runtime.View.renderMatches(state);
                scrollChecklistSource(keywordId);
            } else if (action === "delete-keyword") {
                runtime.State.removeKeyword(state, actionTarget.dataset.keywordId || "");
                recomputeSearch();
                refresh("关键词已删除。", "info");
            } else if (action === "toggle-keyword") {
                const keywordId = actionTarget.dataset.keywordId || "";
                const keyword = state.keywords.find((item) => item.id === keywordId);
                if (!keyword) return;
                runtime.State.setKeywordEnabled(state, keywordId, keyword.enabled === false);
                recomputeSearch();
                refresh(keyword.enabled === false ? "关键词已停用。" : "关键词已启用。", "info");
            } else if (action === "focus-match") {
                focusMatch(Number(actionTarget.dataset.matchIndex || 0));
            } else if (action === "remove-document") {
                runtime.State.removeDocument(state, actionTarget.dataset.documentId || "");
                recomputeSearch();
                refresh("手册已删除。", "info");
            } else if (action === "remove-evidence") {
                const index = Number(actionTarget.dataset.evidenceIndex || -1);
                if (index >= 0) {
                    state.evidenceItems.splice(index, 1);
                    runtime.View.renderEvidence(state);
                }
            } else if (action === "clear-evidence-title") {
                getElement<HTMLInputElement>("evidenceTitleInput").value = "";
                renderEvidenceDraft();
            }
        });
    }

    function renderEvidenceDraft(): void {
        const draft = getElement<HTMLElement>("evidenceDraft");
        const title = getElement<HTMLInputElement>("evidenceTitleInput").value.trim();
        if (!title) {
            draft.className = "evidence-draft empty";
            draft.textContent = "尚未选择要绑定的检查单条款。";
            return;
        }
        draft.className = "evidence-draft";
        draft.innerHTML = `
            <div class="evidence-draft-label">待绑定检查单条款</div>
            <div class="evidence-draft-text">${runtime.View.escapeHtml(title)}</div>
            <div class="evidence-draft-actions">
                <button class="btn btn-sm btn-outline-secondary" data-action="clear-evidence-title">清空</button>
            </div>
        `;
    }

    function bindExport(): void {
        const importInput = getElement<HTMLInputElement>("evidenceImportInput");
        getElement<HTMLButtonElement>("importEvidenceBtn").addEventListener("click", () => {
            importInput.click();
        });
        importInput.addEventListener("change", async () => {
            const file = importInput.files?.[0];
            importInput.value = "";
            if (!file) return;
            try {
                const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
                runtime.State.replaceEvidence(state, runtime.Export.parseEvidenceWorkbook(workbook));
                runtime.View.renderEvidence(state);
                runtime.View.renderStatus(`已导入 ${state.evidenceItems.length} 条依据。`, "success");
            } catch (error) {
                runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
            }
        });
        getElement<HTMLButtonElement>("exportEvidenceBtn").addEventListener("click", () => {
            if (!state.evidenceItems.length) {
                runtime.View.renderStatus("没有可导出的依据。", "error");
                return;
            }
            const workbook = runtime.Export.buildEvidenceWorkbook(state.evidenceItems);
            XLSX.writeFile(workbook, `审计之王_依据篮子_${formatLocalDate(new Date())}.xlsx`);
        });
        getElement<HTMLButtonElement>("addDetailEvidenceBtn").addEventListener("click", () => {
            addEvidenceFromDetailSelection();
        });
    }

    function getCurrentMatch(): AuditKingMatch | null {
        return getFilteredMatches()[state.currentMatchIndex] || null;
    }

    function getDetailSelectionText(): string {
        const selection = window.getSelection();
        const detail = document.getElementById("matchDetail");
        if (!selection || !detail || selection.rangeCount === 0) return "";
        const range = selection.getRangeAt(0);
        const startElement = range.startContainer.nodeType === Node.TEXT_NODE
            ? range.startContainer.parentElement
            : range.startContainer as Element;
        const endElement = range.endContainer.nodeType === Node.TEXT_NODE
            ? range.endContainer.parentElement
            : range.endContainer as Element;
        if (!startElement || !endElement || !detail.contains(startElement) || !detail.contains(endElement)) {
            return "";
        }
        return selection.toString().trim();
    }

    function addEvidenceFromDetailSelection(): void {
        const match = getCurrentMatch();
        if (!match) {
            runtime.View.renderStatus("请先点击一条命中摘要。", "error");
            return;
        }
        const title = getElement<HTMLInputElement>("evidenceTitleInput").value.trim();
        if (!title) {
            runtime.View.renderStatus("请先从检查单选中依据名称/对应条款。", "error");
            return;
        }
        const excerpt = getDetailSelectionText();
        if (!excerpt) {
            runtime.View.renderStatus("请先在右侧全部详情中选中手册原文。", "error");
            return;
        }
        runtime.State.addEvidence(state, {
            keywordText: match.keywordText,
            title,
            checklistClause: title,
            documentName: match.documentName,
            locationLabel: `第 ${match.blockIndex} 段${match.title ? ` / ${match.title}` : ""}`,
            excerpt,
            note: ""
        });
        runtime.View.renderEvidence(state);
        runtime.View.renderStatus("已加入依据篮子。", "success");
    }

    function bindKeywordImportExport(): void {
        const importInput = getElement<HTMLInputElement>("keywordImportInput");
        getElement<HTMLButtonElement>("importKeywordsBtn").addEventListener("click", () => {
            importInput.click();
        });
        importInput.addEventListener("change", async () => {
            const file = importInput.files?.[0];
            importInput.value = "";
            if (!file) return;
            try {
                const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
                const imported = runtime.KeywordImportExport.parseKeywordWorkbook(workbook);
                runtime.State.replaceKeywords(state, imported);
                recomputeSearch();
                refresh(`已导入 ${state.keywords.length} 个关键词。`, "success");
            } catch (error) {
                runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
            }
        });
        getElement<HTMLButtonElement>("exportKeywordsBtn").addEventListener("click", () => {
            if (!state.keywords.length) {
                runtime.View.renderStatus("没有可导出的关键词。", "error");
                return;
            }
            const workbook = runtime.KeywordImportExport.buildKeywordWorkbook(state.keywords);
            XLSX.writeFile(workbook, `审计之王_关键词_${formatLocalDate(new Date())}.xlsx`);
        });
    }

    function formatLocalDate(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function init(): void {
        bindUploads();
        bindKeywordActions();
        bindFiltersAndNavigation();
        bindDelegatedActions();
        bindExport();
        bindKeywordImportExport();
        renderEvidenceDraft();
        refresh("上传检查单和手册后，手动添加关键词开始检索。");
    }

    document.addEventListener("DOMContentLoaded", init);
})();
