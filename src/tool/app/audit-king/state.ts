(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function createState(): AuditKingStateModel {
        return {
            checklistBlocks: [],
            documents: [],
            documentIndex: null,
            keywords: [],
            searchResult: {
                matches: [],
                countsByKeyword: {}
            },
            currentKeywordId: "all",
            documentFilterId: "all",
            currentMatchIndex: 0,
            evidenceGroups: []
        };
    }

    function rebuildDocumentIndex(state: AuditKingStateModel): void {
        const enabledDocuments = getEnabledDocuments(state);
        state.documentIndex = runtime.SearchEngine?.buildDocumentIndex
            ? runtime.SearchEngine.buildDocumentIndex(enabledDocuments)
            : null;
    }

    function getEnabledDocuments(state: AuditKingStateModel): AuditKingDocument[] {
        return state.documents.filter((documentItem) => documentItem.enabled !== false);
    }

    function addKeyword(
        state: AuditKingStateModel,
        text: string,
        source?: AuditKingKeywordSource,
        options: { afterKeywordId?: string } = {}
    ): AuditKingKeyword {
        const normalized = text.trim();
        if (!normalized) {
            throw new Error("关键词不能为空。");
        }
        const keyword = runtime.KeywordStore.createKeyword(normalized, state.keywords.length, { source });
        const afterIndex = options.afterKeywordId
            ? state.keywords.findIndex((item) => item.id === options.afterKeywordId)
            : -1;
        if (afterIndex >= 0) {
            state.keywords.splice(afterIndex + 1, 0, keyword);
        } else {
            state.keywords.push(keyword);
        }
        if (state.currentKeywordId === "all") {
            state.currentKeywordId = keyword.id;
        }
        return keyword;
    }

    function removeKeyword(state: AuditKingStateModel, keywordId: string): void {
        state.keywords = state.keywords.filter((keyword) => keyword.id !== keywordId);
        if (state.currentKeywordId === keywordId) {
            state.currentKeywordId = state.keywords[0]?.id || "all";
        }
        if (state.keywords.length === 0) {
            state.currentKeywordId = "all";
        }
        delete state.searchResult.countsByKeyword[keywordId];
        state.searchResult.matches = state.searchResult.matches.filter((match) => match.keywordId !== keywordId);
        state.currentMatchIndex = 0;
    }

    function replaceKeywords(state: AuditKingStateModel, importedKeywords: AuditKingImportedKeyword[]): void {
        state.keywords = importedKeywords
            .map((item, index) => runtime.KeywordStore.createKeyword(item.text, index, {
                label: item.label,
                color: item.color,
                enabled: item.enabled,
                source: item.source
            }))
            .filter((keyword) => keyword.text);
        if (runtime.SourceLocator?.resolveKeywordSources) {
            state.keywords = runtime.SourceLocator.resolveKeywordSources(state.keywords, state.checklistBlocks);
        }
        state.currentKeywordId = state.keywords[0]?.id || "all";
        state.currentMatchIndex = 0;
    }

    function setKeywordEnabled(state: AuditKingStateModel, keywordId: string, enabled: boolean): void {
        const keyword = state.keywords.find((item) => item.id === keywordId);
        if (!keyword) return;
        keyword.enabled = enabled;
        state.currentMatchIndex = 0;
    }

    function updateKeywordSource(state: AuditKingStateModel, keywordId: string, source: AuditKingKeywordSource): void {
        const keyword = state.keywords.find((item) => item.id === keywordId);
        if (!keyword) return;
        keyword.source = source;
    }

    function clearKeywordSource(state: AuditKingStateModel, keywordId: string): void {
        const keyword = state.keywords.find((item) => item.id === keywordId);
        if (!keyword) return;
        delete keyword.source;
    }

    function updateKeywordLabel(state: AuditKingStateModel, keywordId: string, label: string): void {
        const keyword = state.keywords.find((item) => item.id === keywordId);
        if (!keyword) return;
        keyword.label = label.trim();
    }

    function moveKeywordToPosition(state: AuditKingStateModel, keywordId: string, targetPosition: number): void {
        if (!keywordId || !Number.isFinite(targetPosition) || !state.keywords.length) return;
        const sourceIndex = state.keywords.findIndex((keyword) => keyword.id === keywordId);
        if (sourceIndex < 0) return;
        const [keyword] = state.keywords.splice(sourceIndex, 1);
        const insertIndex = Math.max(0, Math.min(state.keywords.length, Math.trunc(targetPosition) - 1));
        state.keywords.splice(insertIndex, 0, keyword);
    }

    function setChecklistBlocks(state: AuditKingStateModel, blocks: AuditKingTextBlock[]): void {
        state.checklistBlocks = [...blocks];
        if (runtime.SourceLocator?.resolveKeywordSources) {
            state.keywords = runtime.SourceLocator.resolveKeywordSources(state.keywords, state.checklistBlocks);
        }
    }

    function setDocuments(state: AuditKingStateModel, documents: AuditKingDocument[]): void {
        state.documents = documents.map((documentItem) => ({
            ...documentItem,
            enabled: documentItem.enabled !== false
        }));
        rebuildDocumentIndex(state);
        if (state.documentFilterId !== "all" && !getEnabledDocuments(state).some((documentItem) => documentItem.id === state.documentFilterId)) {
            state.documentFilterId = "all";
        }
    }

    function appendDocuments(state: AuditKingStateModel, documents: AuditKingDocument[]): void {
        setDocuments(state, [...state.documents, ...documents]);
    }

    function removeDocument(state: AuditKingStateModel, documentId: string): void {
        setDocuments(state, state.documents.filter((documentItem) => documentItem.id !== documentId));
    }

    function setDocumentEnabled(state: AuditKingStateModel, documentId: string, enabled: boolean): void {
        const documentItem = state.documents.find((item) => item.id === documentId);
        if (!documentItem) return;
        documentItem.enabled = enabled;
        rebuildDocumentIndex(state);
        if (state.documentFilterId === documentId && !enabled) {
            state.documentFilterId = "all";
        }
        state.currentMatchIndex = 0;
    }

    function setCurrentKeyword(state: AuditKingStateModel, keywordId: string): void {
        state.currentKeywordId = keywordId || "all";
        state.currentMatchIndex = 0;
    }

    function setDocumentFilter(state: AuditKingStateModel, documentId: string): void {
        state.documentFilterId = documentId || "all";
        state.currentMatchIndex = 0;
    }

    function setSearchResult(state: AuditKingStateModel, searchResult: AuditKingSearchResult): void {
        state.searchResult = searchResult;
        state.currentMatchIndex = 0;
    }

    function makeEvidenceGroupId(state: AuditKingStateModel): string {
        return `evidence-group-${state.evidenceGroups.length + 1}`;
    }

    function addEvidenceGroup(
        state: AuditKingStateModel,
        title: string,
        options: { createInitialEntry?: boolean } = {}
    ): AuditKingEvidenceGroup {
        const group = {
            id: makeEvidenceGroupId(state),
            title: title.trim(),
            items: options.createInitialEntry ? [{ content: "", note: "" }] : []
        };
        state.evidenceGroups.push(group);
        return group;
    }

    function updateEvidenceGroupTitle(state: AuditKingStateModel, groupIndex: number, title: string): void {
        const group = state.evidenceGroups[groupIndex];
        if (!group) return;
        group.title = title.trim();
    }

    function removeEvidenceGroup(state: AuditKingStateModel, groupIndex: number): void {
        if (groupIndex < 0 || groupIndex >= state.evidenceGroups.length) return;
        state.evidenceGroups.splice(groupIndex, 1);
    }

    function addEvidenceEntry(state: AuditKingStateModel, groupIndex: number, content: string, note = ""): void {
        const group = state.evidenceGroups[groupIndex];
        if (!group) return;
        group.items.push({
            content: content.trim(),
            note: note.trim()
        });
    }

    function replaceEvidence(state: AuditKingStateModel, groups: AuditKingEvidenceGroup[]): void {
        state.evidenceGroups = groups.map((group, index) => ({
            id: group.id || `evidence-group-${index + 1}`,
            title: group.title,
            items: group.items.map((item) => ({
                content: item.content,
                note: item.note
            }))
        }));
    }

    function updateEvidenceEntry(
        state: AuditKingStateModel,
        groupIndex: number,
        itemIndex: number,
        patch: Partial<AuditKingEvidenceEntry>
    ): void {
        const item = state.evidenceGroups[groupIndex]?.items[itemIndex];
        if (!item) return;
        if (patch.content !== undefined) {
            item.content = patch.content;
        }
        if (patch.note !== undefined) {
            item.note = patch.note;
        }
    }

    function removeEvidenceEntry(state: AuditKingStateModel, groupIndex: number, itemIndex: number): void {
        const group = state.evidenceGroups[groupIndex];
        if (!group) return;
        group.items.splice(itemIndex, 1);
    }

    runtime.State = {
        createState,
        addKeyword,
        removeKeyword,
        setKeywordEnabled,
        updateKeywordSource,
        clearKeywordSource,
        updateKeywordLabel,
        moveKeywordToPosition,
        replaceKeywords,
        setChecklistBlocks,
        setDocuments,
        appendDocuments,
        removeDocument,
        setDocumentEnabled,
        getEnabledDocuments,
        setCurrentKeyword,
        setDocumentFilter,
        setSearchResult,
        addEvidenceGroup,
        updateEvidenceGroupTitle,
        removeEvidenceGroup,
        addEvidenceEntry,
        updateEvidenceEntry,
        replaceEvidence,
        removeEvidenceEntry
    };
})();
