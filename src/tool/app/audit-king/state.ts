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
        state.documentIndex = runtime.SearchEngine?.buildDocumentIndex
            ? runtime.SearchEngine.buildDocumentIndex(state.documents)
            : null;
    }

    function addKeyword(state: AuditKingStateModel, text: string, source?: AuditKingKeywordSource): AuditKingKeyword {
        const normalized = text.trim();
        if (!normalized) {
            throw new Error("关键词不能为空。");
        }
        const keyword = runtime.KeywordStore.createKeyword(normalized, state.keywords.length, { source });
        state.keywords.push(keyword);
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

    function setChecklistBlocks(state: AuditKingStateModel, blocks: AuditKingTextBlock[]): void {
        state.checklistBlocks = [...blocks];
        if (runtime.SourceLocator?.resolveKeywordSources) {
            state.keywords = runtime.SourceLocator.resolveKeywordSources(state.keywords, state.checklistBlocks);
        }
    }

    function setDocuments(state: AuditKingStateModel, documents: AuditKingDocument[]): void {
        state.documents = [...documents];
        rebuildDocumentIndex(state);
        if (state.documentFilterId !== "all" && !documents.some((documentItem) => documentItem.id === state.documentFilterId)) {
            state.documentFilterId = "all";
        }
    }

    function appendDocuments(state: AuditKingStateModel, documents: AuditKingDocument[]): void {
        setDocuments(state, [...state.documents, ...documents]);
    }

    function removeDocument(state: AuditKingStateModel, documentId: string): void {
        setDocuments(state, state.documents.filter((documentItem) => documentItem.id !== documentId));
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

    function addEvidenceGroup(state: AuditKingStateModel, title: string): AuditKingEvidenceGroup {
        const group = {
            id: makeEvidenceGroupId(state),
            title: title.trim(),
            items: []
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
        replaceKeywords,
        setChecklistBlocks,
        setDocuments,
        appendDocuments,
        removeDocument,
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
