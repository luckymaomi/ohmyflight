(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function readConfig(context: AuditKingAppContext): AuditKingFolderScriptConfig {
        return {
            rangeText: context.getElement<HTMLInputElement>("folderRangeInput").value
        };
    }

    function renderPreview(context: AuditKingAppContext): void {
        const preview = context.getElement<HTMLElement>("folderScriptPreview");
        const count = context.getElement<HTMLElement>("folderScriptCount");
        try {
            const folders = runtime.FolderScriptGenerator.buildFolderRanges(readConfig(context));
            count.textContent = `${folders.length} 个文件夹`;
            const visibleFolders = folders.slice(0, 24);
            preview.innerHTML = [
                `<div class="folder-preview-grid">`,
                visibleFolders.map((folder: string) => `<span>${runtime.View.escapeHtml(folder)}</span>`).join(""),
                folders.length > visibleFolders.length ? `<span class="text-muted">...还有 ${folders.length - visibleFolders.length} 个</span>` : "",
                `</div>`
            ].join("");
        } catch (error) {
            count.textContent = "配置需修正";
            preview.innerHTML = `<div class="empty-panel">${runtime.View.escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
        }
    }

    function downloadTextFile(filename: string, content: string): void {
        const blob = new Blob([content], { type: "text/x-python;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function exportPython(context: AuditKingAppContext): void {
        try {
            const python = runtime.FolderScriptGenerator.buildFolderCreatorPython(readConfig(context));
            downloadTextFile("创建审计文件夹.py", python);
            context.runtime.View.renderStatus("已导出创建文件夹 Python。把它放到目标目录运行即可。", "success");
        } catch (error) {
            context.runtime.View.renderStatus(error instanceof Error ? error.message : String(error), "error");
            renderPreview(context);
        }
    }

    function bindFolderScriptActions(context: AuditKingAppContext): void {
        const rangeInput = context.getElement<HTMLInputElement>("folderRangeInput");
        const exportButton = context.getElement<HTMLButtonElement>("exportFolderScriptBtn");

        rangeInput.addEventListener("input", () => renderPreview(context));
        exportButton.addEventListener("click", () => exportPython(context));

        renderPreview(context);
    }

    runtime.FolderScriptActions = {
        bindFolderScriptActions
    };
})();
