(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function addKeyword(
        context: AuditKingAppContext,
        text: string,
        source?: AuditKingKeywordSource,
        options: { afterKeywordId?: string } = {}
    ): void {
        try {
            context.runtime.State.addKeyword(context.state, text, source, options);
            context.recomputeSearch();
            context.refresh(`已加入关键词：${text}`, "success");
        } catch (error) {
            context.runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
        }
    }

    function getChecklistSelection(context: AuditKingAppContext): { text: string; source?: AuditKingKeywordSource } {
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
        const block = context.state.checklistBlocks.find((item) => item.id === (startBlock.dataset.blockId || ""));

        return {
            text,
            source: block && context.runtime.SourceLocator?.makeSource
                ? context.runtime.SourceLocator.makeSource(block, start, end)
                : {
                    blockId: startBlock.dataset.blockId || "",
                    blockIndex: Number(startBlock.dataset.blockIndex || 0) || undefined,
                    start,
                    end,
                    text
                }
        };
    }

    function focusChecklistKeyword(context: AuditKingAppContext, keywordId: string): void {
        if (!keywordId || keywordId === "all") return;
        context.runtime.View.renderChecklist(context.state);
        context.runtime.View.focusChecklistHighlight(context.state);
    }

    function bindSelectionToCurrentKeyword(context: AuditKingAppContext): void {
        if (!context.state.currentKeywordId || context.state.currentKeywordId === "all") {
            context.runtime.View.renderStatus("请先在关键词池选择一个关键词。", "error");
            return;
        }
        const keyword = context.state.keywords.find((item) => item.id === context.state.currentKeywordId);
        if (!keyword) {
            context.runtime.View.renderStatus("当前关键词不存在。", "error");
            return;
        }
        const selection = getChecklistSelection(context);
        if (!selection.text || !selection.source) {
            context.runtime.View.renderStatus("请先在检查单参考中选中要绑定的位置。", "error");
            return;
        }
        context.runtime.State.updateKeywordSource(context.state, keyword.id, selection.source);
        context.runtime.View.renderKeywords(context.state);
        context.runtime.View.renderChecklist(context.state);
        context.runtime.View.focusChecklistHighlight(context.state);
        context.runtime.View.renderStatus(`已更新关键词来源：${keyword.text}`, "success");
    }

    function unbindCurrentKeywordSource(context: AuditKingAppContext): void {
        if (!context.state.currentKeywordId || context.state.currentKeywordId === "all") {
            context.runtime.View.renderStatus("请先在关键词池选择一个关键词。", "error");
            return;
        }
        const keyword = context.state.keywords.find((item) => item.id === context.state.currentKeywordId);
        if (!keyword) {
            context.runtime.View.renderStatus("当前关键词不存在。", "error");
            return;
        }
        context.runtime.State.clearKeywordSource(context.state, keyword.id);
        context.runtime.View.renderKeywords(context.state);
        context.runtime.View.renderChecklist(context.state);
        context.runtime.View.renderStatus(`已解绑关键词来源：${keyword.text}`, "success");
    }

    function bindKeywordActions(context: AuditKingAppContext): void {
        context.getElement<HTMLButtonElement>("addSelectedKeywordBtn").addEventListener("click", () => {
            const selection = getChecklistSelection(context);
            addKeyword(context, selection.text, selection.source, {
                afterKeywordId: context.state.currentKeywordId !== "all" ? context.state.currentKeywordId : undefined
            });
        });

        context.getElement<HTMLButtonElement>("bindSelectedSourceBtn").addEventListener("click", () => {
            bindSelectionToCurrentKeyword(context);
        });

        context.getElement<HTMLButtonElement>("unbindSelectedSourceBtn").addEventListener("click", () => {
            unbindCurrentKeywordSource(context);
        });

        context.getElement<HTMLButtonElement>("addKeywordBtn").addEventListener("click", () => {
            const input = context.getElement<HTMLInputElement>("keywordInput");
            addKeyword(context, input.value);
            input.value = "";
        });

        context.getElement<HTMLInputElement>("keywordInput").addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const input = event.currentTarget as HTMLInputElement;
            addKeyword(context, input.value);
            input.value = "";
        });

        document.addEventListener("input", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            if (target.dataset.action !== "edit-keyword-label") return;
            context.runtime.State.updateKeywordLabel(context.state, target.dataset.keywordId || "", target.value);
        });

        document.addEventListener("change", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            if (target.dataset.action !== "edit-keyword-order") return;
            if (!target.value.trim()) {
                context.runtime.View.renderKeywords(context.state);
                return;
            }
            const targetPosition = Number(target.value);
            if (!Number.isFinite(targetPosition) || targetPosition < 1) {
                context.runtime.View.renderKeywords(context.state);
                return;
            }
            context.runtime.State.moveKeywordToPosition(context.state, target.dataset.keywordId || "", targetPosition);
            context.runtime.View.renderKeywords(context.state);
            context.runtime.View.renderStatus("关键词顺序已调整。", "success");
        });

        document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const actionTarget = target.closest<HTMLElement>("[data-action]");
            if (!actionTarget) return;
            const action = actionTarget.dataset.action;
            if (action === "select-keyword") {
                const keywordId = actionTarget.dataset.keywordId || "all";
                context.runtime.State.setCurrentKeyword(context.state, keywordId);
                context.runtime.View.renderKeywords(context.state);
                context.runtime.View.renderKeywordEvidences(context.state);
                context.runtime.View.renderMatches(context.state);
                focusChecklistKeyword(context, keywordId);
            } else if (action === "delete-keyword") {
                context.runtime.State.removeKeyword(context.state, actionTarget.dataset.keywordId || "");
                context.recomputeSearch();
                context.refresh("关键词已删除。", "info");
            } else if (action === "toggle-keyword") {
                const keywordId = actionTarget.dataset.keywordId || "";
                const keyword = context.state.keywords.find((item) => item.id === keywordId);
                if (!keyword) return;
                context.runtime.State.setKeywordEnabled(context.state, keywordId, keyword.enabled === false);
                context.recomputeSearch();
                context.refresh(keyword.enabled === false ? "关键词已停用。" : "关键词已启用。", "info");
            }
        });
    }

    runtime.KeywordActions = {
        bindKeywordActions
    };
})();
