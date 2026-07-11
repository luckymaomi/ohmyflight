(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function createAppContext(): AuditKingAppContext {
        const state: AuditKingStateModel = runtime.State.createState();

        function getElement<T extends HTMLElement>(id: string): T {
            return runtime.View.getElement(id) as T;
        }

        function recomputeSearch(): void {
            const enabledDocuments = runtime.State.getEnabledDocuments
                ? runtime.State.getEnabledDocuments(state)
                : state.documents.filter((documentItem) => documentItem.enabled !== false);
            const result = state.documentIndex
                ? runtime.SearchEngine.searchIndex(state.documentIndex, state.checkItems)
                : runtime.SearchEngine.searchDocuments(enabledDocuments, state.checkItems);
            runtime.State.setSearchResult(state, result);
        }

        function refresh(message = "", type: "info" | "success" | "error" = "info"): void {
            runtime.View.renderAll(state);
            if (message) {
                runtime.View.renderStatus(message, type);
            }
        }

        function getFilteredMatches(): AuditKingMatch[] {
            return runtime.SearchEngine.filterMatches(state.searchResult.matches, {
                checkItemId: state.currentCheckItemId,
                documentId: state.documentFilterId
            });
        }

        function getCurrentFilteredMatch(): AuditKingMatch | null {
            const matches = getFilteredMatches();
            return matches[Math.max(0, Math.min(matches.length - 1, state.currentMatchIndex))] || null;
        }

        function focusMatch(index: number): void {
            const matches = getFilteredMatches();
            if (!matches.length) return;
            const nextIndex = Math.max(0, Math.min(matches.length - 1, index));
            if (nextIndex !== state.currentMatchIndex) {
                runtime.State.resetMatchDetailContext(state);
            }
            state.currentMatchIndex = nextIndex;
            runtime.View.renderMatches(state);
        }

        function formatLocalDate(date: Date): string {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        }

        return {
            runtime,
            state,
            getElement,
            recomputeSearch,
            refresh,
            getFilteredMatches,
            getCurrentFilteredMatch,
            focusMatch,
            formatLocalDate
        };
    }

    runtime.AppContext = {
        createAppContext
    };
})();
