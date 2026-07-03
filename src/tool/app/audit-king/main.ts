(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});
    const state: AuditKingStateModel = runtime.State.createState();

    function getElement<T extends HTMLElement>(id: string): T {
        return runtime.View.getElement(id) as T;
    }

    function recomputeSearch(): void {
        const enabledDocuments = runtime.State.getEnabledDocuments
            ? runtime.State.getEnabledDocuments(state)
            : state.documents.filter((documentItem) => documentItem.enabled !== false);
        const result = state.documentIndex
            ? runtime.SearchEngine.searchIndex(state.documentIndex, state.keywords)
            : runtime.SearchEngine.searchDocuments(enabledDocuments, state.keywords);
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

    function addKeyword(text: string, source?: AuditKingKeywordSource, options: { afterKeywordId?: string } = {}): void {
        try {
            runtime.State.addKeyword(state, text, source, options);
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
            addKeyword(selection.text, selection.source, {
                afterKeywordId: state.currentKeywordId !== "all" ? state.currentKeywordId : undefined
            });
        });

        getElement<HTMLButtonElement>("bindSelectedSourceBtn").addEventListener("click", () => {
            bindSelectionToCurrentKeyword();
        });

        getElement<HTMLButtonElement>("unbindSelectedSourceBtn").addEventListener("click", () => {
            unbindCurrentKeywordSource();
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

        document.addEventListener("input", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            if (target.dataset.action !== "edit-keyword-label") return;
            runtime.State.updateKeywordLabel(state, target.dataset.keywordId || "", target.value);
        });

        document.addEventListener("change", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            if (target.dataset.action !== "edit-keyword-order") return;
            if (!target.value.trim()) {
                runtime.View.renderKeywords(state);
                return;
            }
            const targetPosition = Number(target.value);
            if (!Number.isFinite(targetPosition) || targetPosition < 1) {
                runtime.View.renderKeywords(state);
                return;
            }
            runtime.State.moveKeywordToPosition(state, target.dataset.keywordId || "", targetPosition);
            runtime.View.renderKeywords(state);
            runtime.View.renderStatus("关键词顺序已调整。", "success");
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
        const block = state.checklistBlocks.find((item) => item.id === (startBlock.dataset.blockId || ""));

        return {
            text,
            source: block && runtime.SourceLocator?.makeSource
                ? runtime.SourceLocator.makeSource(block, start, end)
                : {
                    blockId: startBlock.dataset.blockId || "",
                    blockIndex: Number(startBlock.dataset.blockIndex || 0) || undefined,
                    start,
                    end,
                    text
                }
        };
    }

    function focusChecklistKeyword(keywordId: string): void {
        if (!keywordId || keywordId === "all") return;
        runtime.View.renderChecklist(state);
        runtime.View.focusChecklistHighlight(state);
    }

    function bindSelectionToCurrentKeyword(): void {
        if (!state.currentKeywordId || state.currentKeywordId === "all") {
            runtime.View.renderStatus("请先在关键词池选择一个关键词。", "error");
            return;
        }
        const keyword = state.keywords.find((item) => item.id === state.currentKeywordId);
        if (!keyword) {
            runtime.View.renderStatus("当前关键词不存在。", "error");
            return;
        }
        const selection = getChecklistSelection();
        if (!selection.text || !selection.source) {
            runtime.View.renderStatus("请先在检查单参考中选中要绑定的位置。", "error");
            return;
        }
        runtime.State.updateKeywordSource(state, keyword.id, selection.source);
        runtime.View.renderKeywords(state);
        runtime.View.renderChecklist(state);
        runtime.View.focusChecklistHighlight(state);
        runtime.View.renderStatus(`已更新关键词来源：${keyword.text}`, "success");
    }

    function unbindCurrentKeywordSource(): void {
        if (!state.currentKeywordId || state.currentKeywordId === "all") {
            runtime.View.renderStatus("请先在关键词池选择一个关键词。", "error");
            return;
        }
        const keyword = state.keywords.find((item) => item.id === state.currentKeywordId);
        if (!keyword) {
            runtime.View.renderStatus("当前关键词不存在。", "error");
            return;
        }
        runtime.State.clearKeywordSource(state, keyword.id);
        runtime.View.renderKeywords(state);
        runtime.View.renderChecklist(state);
        runtime.View.renderStatus(`已解绑关键词来源：${keyword.text}`, "success");
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
                focusChecklistKeyword(keywordId);
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
            } else if (action === "toggle-document") {
                const documentId = actionTarget.dataset.documentId || "";
                const documentItem = state.documents.find((item) => item.id === documentId);
                if (!documentItem) return;
                runtime.State.setDocumentEnabled(state, documentId, documentItem.enabled === false);
                recomputeSearch();
                refresh(documentItem.enabled === false ? "手册已停用。" : "手册已启用。", "info");
            } else if (action === "remove-evidence") {
                const groupIndex = Number(actionTarget.dataset.groupIndex || -1);
                const itemIndex = Number(actionTarget.dataset.itemIndex || -1);
                if (groupIndex >= 0 && itemIndex >= 0) {
                    runtime.State.removeEvidenceEntry(state, groupIndex, itemIndex);
                    runtime.View.renderEvidence(state);
                }
            } else if (action === "remove-evidence-group") {
                const groupIndex = Number(actionTarget.dataset.groupIndex || -1);
                if (groupIndex >= 0) {
                    runtime.State.removeEvidenceGroup(state, groupIndex);
                    runtime.View.renderEvidence(state);
                }
            } else if (action === "add-evidence-entry") {
                const groupIndex = Number(actionTarget.dataset.groupIndex || -1);
                addEvidenceEntryFromGroup(groupIndex);
            }
        });
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const matchItem = target.closest<HTMLElement>(".match-item[data-action='focus-match']");
            if (!matchItem) return;
            event.preventDefault();
            focusMatch(Number(matchItem.dataset.matchIndex || 0));
        });
    }

    function bindEvidenceEditing(): void {
        getElement<HTMLButtonElement>("addEvidenceGroupBtn").addEventListener("click", () => {
            const input = getElement<HTMLInputElement>("evidenceGroupTitleInput");
            const title = input.value.trim();
            if (!title) {
                runtime.View.renderStatus("请先填写条款名称。", "error");
                return;
            }
            runtime.State.addEvidenceGroup(state, title, { createInitialEntry: true });
            input.value = "";
            runtime.View.renderEvidence(state);
            runtime.View.scrollEvidenceToBottom();
            runtime.View.renderStatus("已新增条款。", "success");
        });
        getElement<HTMLInputElement>("evidenceGroupTitleInput").addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            getElement<HTMLButtonElement>("addEvidenceGroupBtn").click();
        });
        document.addEventListener("input", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
            const action = target.dataset.action;
            const groupIndex = Number(target.dataset.groupIndex || -1);
            const itemIndex = Number(target.dataset.itemIndex || -1);
            if (action === "edit-evidence-group-title" && groupIndex >= 0) {
                runtime.State.updateEvidenceGroupTitle(state, groupIndex, target.value);
            } else if (action === "edit-evidence-content" && groupIndex >= 0 && itemIndex >= 0) {
                runtime.State.updateEvidenceEntry(state, groupIndex, itemIndex, { content: target.value });
            } else if (action === "edit-evidence-note" && groupIndex >= 0 && itemIndex >= 0) {
                runtime.State.updateEvidenceEntry(state, groupIndex, itemIndex, { note: target.value });
            }
        });
    }

    function addEvidenceEntryFromGroup(groupIndex: number): void {
        if (groupIndex < 0) return;
        runtime.State.addEvidenceEntry(state, groupIndex, "", "");
        runtime.View.renderEvidence(state);
        runtime.View.renderStatus("已新增依据行。", "success");
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
                runtime.View.renderStatus(`已导入 ${state.evidenceGroups.length} 个条款 / ${countEvidenceEntries()} 条依据。`, "success");
            } catch (error) {
                runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
            }
        });
        getElement<HTMLButtonElement>("exportEvidenceBtn").addEventListener("click", () => {
            if (!state.evidenceGroups.length) {
                runtime.View.renderStatus("没有可导出的审计篮子内容。", "error");
                return;
            }
            const workbook = runtime.Export.buildEvidenceWorkbook(state.evidenceGroups);
            XLSX.writeFile(workbook, `审计之王_审计篮子_${formatLocalDate(new Date())}.xlsx`);
        });
    }

    function getCurrentMatch(): AuditKingMatch | null {
        return getFilteredMatches()[state.currentMatchIndex] || null;
    }

    function countEvidenceEntries(): number {
        return state.evidenceGroups.reduce((total, group) => total + group.items.length, 0);
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
        bindEvidenceEditing();
        refresh("上传检查单和手册后，手动添加关键词开始检索。");
    }

    document.addEventListener("DOMContentLoaded", init);
})();
