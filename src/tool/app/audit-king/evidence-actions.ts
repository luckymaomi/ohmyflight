(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function countEvidenceEntries(context: AuditKingAppContext): number {
        return context.state.evidenceGroups.reduce((total, group) => total + group.items.length, 0);
    }

    function addEvidenceEntryFromGroup(context: AuditKingAppContext, groupIndex: number): void {
        if (groupIndex < 0) return;
        context.runtime.State.addEvidenceEntry(context.state, groupIndex, "", "");
        context.runtime.View.renderEvidence(context.state);
        context.runtime.View.renderStatus("已新增依据行。", "success");
    }

    function bindEvidenceEditing(context: AuditKingAppContext): void {
        context.getElement<HTMLButtonElement>("addEvidenceGroupBtn").addEventListener("click", () => {
            const input = context.getElement<HTMLInputElement>("evidenceGroupTitleInput");
            const title = input.value.trim();
            if (!title) {
                context.runtime.View.renderStatus("请先填写条款名称。", "error");
                return;
            }
            context.runtime.State.addEvidenceGroup(context.state, title, { createInitialEntry: true });
            input.value = "";
            context.runtime.View.renderEvidence(context.state);
            context.runtime.View.scrollEvidenceToBottom();
            context.runtime.View.renderStatus("已新增条款。", "success");
        });
        context.getElement<HTMLInputElement>("evidenceGroupTitleInput").addEventListener("keydown", (event: KeyboardEvent) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            context.getElement<HTMLButtonElement>("addEvidenceGroupBtn").click();
        });
        document.addEventListener("input", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
            const action = target.dataset.action;
            const groupIndex = Number(target.dataset.groupIndex || -1);
            const itemIndex = Number(target.dataset.itemIndex || -1);
            if (action === "edit-evidence-group-title" && groupIndex >= 0) {
                context.runtime.State.updateEvidenceGroupTitle(context.state, groupIndex, target.value);
            } else if (action === "edit-evidence-content" && groupIndex >= 0 && itemIndex >= 0) {
                context.runtime.State.updateEvidenceEntry(context.state, groupIndex, itemIndex, { content: target.value });
            } else if (action === "edit-evidence-note" && groupIndex >= 0 && itemIndex >= 0) {
                context.runtime.State.updateEvidenceEntry(context.state, groupIndex, itemIndex, { note: target.value });
            }
        });
        document.addEventListener("change", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement)) return;
            if (target.dataset.action !== "edit-evidence-group-order") return;
            if (!target.value.trim()) {
                context.runtime.View.renderEvidence(context.state);
                return;
            }
            const groupIndex = Number(target.dataset.groupIndex || -1);
            const targetPosition = Number(target.value);
            if (!Number.isInteger(groupIndex) || groupIndex < 0 || !Number.isFinite(targetPosition) || targetPosition < 1) {
                context.runtime.View.renderEvidence(context.state);
                return;
            }
            context.runtime.State.moveEvidenceGroupToPosition(context.state, groupIndex, targetPosition);
            context.runtime.View.renderEvidence(context.state);
            context.runtime.View.renderStatus("审计篮子条款顺序已调整。", "success");
        });
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const actionTarget = target.closest<HTMLElement>("[data-action]");
            if (!actionTarget) return;
            const action = actionTarget.dataset.action;
            if (action === "remove-evidence") {
                const groupIndex = Number(actionTarget.dataset.groupIndex || -1);
                const itemIndex = Number(actionTarget.dataset.itemIndex || -1);
                if (groupIndex >= 0 && itemIndex >= 0) {
                    context.runtime.State.removeEvidenceEntry(context.state, groupIndex, itemIndex);
                    context.runtime.View.renderEvidence(context.state);
                }
            } else if (action === "remove-evidence-group") {
                const groupIndex = Number(actionTarget.dataset.groupIndex || -1);
                if (groupIndex >= 0) {
                    context.runtime.State.removeEvidenceGroup(context.state, groupIndex);
                    context.runtime.View.renderEvidence(context.state);
                }
            } else if (action === "add-evidence-entry") {
                const groupIndex = Number(actionTarget.dataset.groupIndex || -1);
                addEvidenceEntryFromGroup(context, groupIndex);
            }
        });
    }

    function bindEvidenceImportExport(context: AuditKingAppContext): void {
        const importInput = context.getElement<HTMLInputElement>("evidenceImportInput");
        context.getElement<HTMLButtonElement>("importEvidenceBtn").addEventListener("click", () => {
            importInput.click();
        });
        importInput.addEventListener("change", async () => {
            const file = importInput.files?.[0];
            importInput.value = "";
            if (!file) return;
            try {
                const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
                context.runtime.State.replaceEvidence(context.state, context.runtime.Export.parseEvidenceWorkbook(workbook));
                context.runtime.View.renderEvidence(context.state);
                context.runtime.View.renderStatus(`已导入 ${context.state.evidenceGroups.length} 个条款 / ${countEvidenceEntries(context)} 条依据。`, "success");
            } catch (error) {
                context.runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
            }
        });
        context.getElement<HTMLButtonElement>("exportEvidenceBtn").addEventListener("click", () => {
            if (!context.state.evidenceGroups.length) {
                context.runtime.View.renderStatus("没有可导出的审计篮子内容。", "error");
                return;
            }
            const workbook = context.runtime.Export.buildEvidenceWorkbook(context.state.evidenceGroups);
            XLSX.writeFile(workbook, `审计之王_审计篮子_${context.formatLocalDate(new Date())}.xlsx`);
        });
    }

    runtime.EvidenceActions = {
        bindEvidenceEditing,
        bindEvidenceImportExport
    };
})();
