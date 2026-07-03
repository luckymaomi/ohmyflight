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
            evidenceItems: []
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
        state.currentKeywordId = state.keywords[0]?.id || "all";
        state.currentMatchIndex = 0;
    }

    function setKeywordEnabled(state: AuditKingStateModel, keywordId: string, enabled: boolean): void {
        const keyword = state.keywords.find((item) => item.id === keywordId);
        if (!keyword) return;
        keyword.enabled = enabled;
        state.currentMatchIndex = 0;
    }

    function setChecklistBlocks(state: AuditKingStateModel, blocks: AuditKingTextBlock[]): void {
        state.checklistBlocks = [...blocks];
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

    function addEvidence(state: AuditKingStateModel, item: AuditKingEvidenceItem): void {
        state.evidenceItems.push(item);
    }

    function replaceEvidence(state: AuditKingStateModel, items: AuditKingEvidenceItem[]): void {
        state.evidenceItems = [...items];
    }

    runtime.State = {
        createState,
        addKeyword,
        removeKeyword,
        setKeywordEnabled,
        replaceKeywords,
        setChecklistBlocks,
        setDocuments,
        appendDocuments,
        removeDocument,
        setCurrentKeyword,
        setDocumentFilter,
        setSearchResult,
        addEvidence,
        replaceEvidence
    };
})();
