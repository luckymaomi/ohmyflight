type VersionInfo = {
    commit?: string;
    builtAt?: string;
    commits?: Array<{
        hash?: string;
        message?: string;
    }>;
};

const allToolRows: ToolItem[] = Array.isArray(tools) ? tools : [];

const searchInput = document.getElementById("searchInput");
const tableBody = document.getElementById("toolRows");
const emptyState = document.getElementById("emptyState");
const versionPanel = document.getElementById("versionPanel");

if (
    searchInput instanceof HTMLInputElement
    && tableBody instanceof HTMLTableSectionElement
    && emptyState instanceof HTMLElement
) {
    renderToolRows(allToolRows);
    bindSearch(searchInput);
    renderVersionPanel();
}

function bindSearch(input: HTMLInputElement): void {
    input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        const rows = query
            ? allToolRows.filter((item) => `${item.name} ${item.desc}`.toLowerCase().includes(query))
            : allToolRows;
        renderToolRows(rows);
    });
}

function renderToolRows(rows: ToolItem[]): void {
    if (!(tableBody instanceof HTMLTableSectionElement) || !(emptyState instanceof HTMLElement)) return;

    tableBody.innerHTML = rows.map((item) => {
        return `
            <tr>
                <td><a class="tool-link" href="${escapeHtml(resolveToolUrl(item))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a></td>
                <td>${escapeHtml(item.desc)}</td>
                <td class="status-cell">${renderStatus(item)}</td>
            </tr>
        `;
    }).join("");
    emptyState.hidden = rows.length > 0;
}

function renderStatus(item: ToolItem): string {
    if (item.status === "wip") {
        return '<span class="status-text wip">开发中</span>';
    }
    return '<img class="status-done-img" src="./assets/status-done.png" alt="已完成">';
}

function resolveToolUrl(item: ToolItem): string {
    return `./app/${item.entry}/index.html`;
}

async function renderVersionPanel(): Promise<void> {
    if (!(versionPanel instanceof HTMLElement)) return;

    try {
        const response = await fetch("../version.json", { cache: "no-store" });
        if (!response.ok) return;

        const version = await response.json() as VersionInfo;
        const commit = version.commit || "unknown";
        const builtAt = version.builtAt ? new Date(version.builtAt) : null;
        const builtAtText = builtAt && !Number.isNaN(builtAt.getTime())
            ? builtAt.toLocaleString("zh-CN", { hour12: false })
            : "未知时间";
        const logs = (version.commits || []).slice(0, 3)
            .map((item) => {
                const hash = item.hash ? `${item.hash} ` : "";
                return `<span>${escapeHtml(hash + (item.message || ""))}</span>`;
            })
            .join("");

        versionPanel.innerHTML = `
            当前版本 <strong>${escapeHtml(commit)}</strong>
            · 构建 ${escapeHtml(builtAtText)}
            ${logs ? ` · 最近更新 <span class="version-log">${logs}</span>` : ""}
        `;
        versionPanel.classList.add("is-visible");
    } catch {
        versionPanel.classList.remove("is-visible");
    }
}

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
