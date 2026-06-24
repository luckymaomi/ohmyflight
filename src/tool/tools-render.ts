type VersionInfo = {
    commit?: string;
    builtAt?: string;
    commits?: Array<{
        hash?: string;
        date?: string;
        message?: string;
    }>;
};

const allToolRows: ToolItem[] = Array.isArray(tools) ? tools : [];

const searchInput = document.getElementById("searchInput");
const toolGrid = document.getElementById("toolGrid");
const emptyState = document.getElementById("emptyState");
const greetingText = document.getElementById("greetingText");
const versionMeta = document.getElementById("versionMeta");
const commitLog = document.getElementById("commitLog");
const logToggle = document.getElementById("logToggle");
const commitLogWrap = document.getElementById("commitLogWrap");

if (
    searchInput instanceof HTMLInputElement
    && toolGrid instanceof HTMLElement
    && emptyState instanceof HTMLElement
) {
    renderGreeting();
    renderToolCards(allToolRows);
    bindSearch(searchInput);
    bindLogToggle();
    renderVersion();
}

function renderGreeting(): void {
    if (!(greetingText instanceof HTMLElement)) return;

    const hour = new Date().getHours();
    const greeting = hour < 11
        ? "早上好"
        : hour < 14
            ? "中午好"
            : hour < 19
                ? "下午好"
                : "晚上好";
    greetingText.textContent = `${greeting}，皇帝`;
}

function bindSearch(input: HTMLInputElement): void {
    input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        const rows = query
            ? allToolRows.filter((item) => `${item.name} ${item.desc}`.toLowerCase().includes(query))
            : allToolRows;
        renderToolCards(rows);
    });
}

function renderToolCards(rows: ToolItem[]): void {
    if (!(toolGrid instanceof HTMLElement) || !(emptyState instanceof HTMLElement)) return;

    toolGrid.innerHTML = rows.map((item) => `
        <div class="col-12 col-sm-6 col-md-4 col-xl-2">
            <article class="card tool-card">
                <div class="tool-cover${item.status === "wip" ? " is-wip" : ""}">
                    ${item.status === "wip" ? "" : '<img src="./assets/status-done.png" alt="">'}
                </div>
                <div class="card-body">
                    <div class="tool-name-row">
                        <a class="tool-name stretched-link" href="${escapeHtml(resolveToolUrl(item))}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)}</a>
                        ${renderStatus(item)}
                    </div>
                    <p class="tool-desc mb-3">${escapeHtml(item.desc)}</p>
                </div>
            </article>
        </div>
    `).join("");

    emptyState.hidden = rows.length > 0;
}

function renderStatus(item: ToolItem): string {
    if (item.status === "wip") {
        return '<span class="badge status-badge status-wip">开发中</span>';
    }
    return '<span class="badge status-badge status-done">可用</span>';
}

function resolveToolUrl(item: ToolItem): string {
    return `./app/${item.entry}/index.html`;
}

async function renderVersion(): Promise<void> {
    if (!(versionMeta instanceof HTMLElement) || !(commitLog instanceof HTMLElement)) return;

    try {
        const response = await fetch("../version.json", { cache: "no-store" });
        if (!response.ok) throw new Error("version not found");

        const version = await response.json() as VersionInfo;
        const builtAt = version.builtAt ? new Date(version.builtAt) : null;
        const builtAtText = builtAt && !Number.isNaN(builtAt.getTime())
            ? builtAt.toLocaleString("zh-CN", { hour12: false })
            : "未知时间";
        const commits = Array.isArray(version.commits) ? version.commits : [];

        versionMeta.textContent = `${version.commit || "unknown"} · ${builtAtText}`;
        commitLog.innerHTML = commits.length
            ? commits.map((item) => `
                <div class="commit-item">
                    <span class="commit-date">${escapeHtml(formatCommitDate(item.date))}</span>
                    <span class="commit-hash">${escapeHtml(item.hash || "")}</span>
                    <span class="commit-message">${escapeHtml(item.message || "")}</span>
                </div>
            `).join("")
            : '<div class="commit-empty">暂无记录。</div>';
    } catch {
        versionMeta.textContent = "";
        commitLog.innerHTML = '<div class="commit-empty">暂无记录。</div>';
    }
}

function bindLogToggle(): void {
    if (!(logToggle instanceof HTMLElement) || !(commitLogWrap instanceof HTMLElement)) return;

    commitLogWrap.addEventListener("shown.bs.collapse", () => {
        logToggle.textContent = "收起";
        logToggle.setAttribute("aria-expanded", "true");
    });
    commitLogWrap.addEventListener("hidden.bs.collapse", () => {
        logToggle.textContent = "展开";
        logToggle.setAttribute("aria-expanded", "false");
    });
}

function formatCommitDate(value: unknown): string {
    const date = value ? new Date(String(value)) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
