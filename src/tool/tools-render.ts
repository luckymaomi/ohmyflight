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
const historyToggle = document.getElementById("historyToggle");
const historyWrap = document.getElementById("historyWrap");
const historyContent = document.getElementById("historyContent");

if (
    searchInput instanceof HTMLInputElement
    && toolGrid instanceof HTMLElement
    && emptyState instanceof HTMLElement
) {
    renderGreeting();
    renderToolCards(allToolRows);
    bindSearch(searchInput);
    bindLogToggle();
    bindHistoryToggle();
    renderVersion();
    renderHistory();
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

async function renderHistory(): Promise<void> {
    if (!(historyContent instanceof HTMLElement)) return;

    try {
        const response = await fetch("../history.md", { cache: "no-store" });
        if (!response.ok) throw new Error("history not found");

        const markdown = await response.text();
        historyContent.innerHTML = renderMarkdown(markdown);
    } catch {
        historyContent.innerHTML = '<div class="commit-empty">暂无开发历史。</div>';
    }
}

function bindHistoryToggle(): void {
    if (!(historyToggle instanceof HTMLElement) || !(historyWrap instanceof HTMLElement)) return;

    historyWrap.addEventListener("shown.bs.collapse", () => {
        historyToggle.textContent = "收起";
        historyToggle.setAttribute("aria-expanded", "true");
    });
    historyWrap.addEventListener("hidden.bs.collapse", () => {
        historyToggle.textContent = "展开";
        historyToggle.setAttribute("aria-expanded", "false");
    });
}

function renderMarkdown(markdown: string): string {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const html: string[] = [];
    let paragraph: string[] = [];
    let listItems: string[] = [];
    let orderedListItems: string[] = [];
    let tableLines: string[] = [];
    let codeLines: string[] = [];
    let inCodeBlock = false;

    const flushParagraph = (): void => {
        if (!paragraph.length) return;
        html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
        paragraph = [];
    };

    const flushList = (): void => {
        if (!listItems.length) return;
        html.push(`<ul>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
        listItems = [];
    };

    const flushOrderedList = (): void => {
        if (!orderedListItems.length) return;
        html.push(`<ol>${orderedListItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
        orderedListItems = [];
    };

    const flushTable = (): void => {
        if (tableLines.length < 2 || !isMarkdownTableSeparator(tableLines[1])) {
            paragraph.push(...tableLines);
            tableLines = [];
            return;
        }

        const headers = splitMarkdownTableRow(tableLines[0]);
        const rows = tableLines.slice(2).map(splitMarkdownTableRow);
        html.push(`
            <div class="history-table-wrap">
                <table>
                    <thead>
                        <tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr>
                    </thead>
                    <tbody>
                        ${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("")}
                    </tbody>
                </table>
            </div>
        `);
        tableLines = [];
    };

    const flushBlocks = (): void => {
        flushParagraph();
        flushList();
        flushOrderedList();
        flushTable();
    };

    for (const line of lines) {
        if (line.trim().startsWith("```")) {
            if (inCodeBlock) {
                html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
                codeLines = [];
                inCodeBlock = false;
                continue;
            }

            flushBlocks();
            inCodeBlock = true;
            continue;
        }

        if (inCodeBlock) {
            codeLines.push(line);
            continue;
        }

        if (!line.trim()) {
            flushBlocks();
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.+)$/);
        if (heading) {
            flushBlocks();
            const level = Math.min(heading[1].length + 1, 6);
            html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
            continue;
        }

        const listItem = line.match(/^\s*[-*]\s+(.+)$/);
        if (listItem) {
            flushParagraph();
            flushOrderedList();
            flushTable();
            listItems.push(listItem[1]);
            continue;
        }

        const orderedListItem = line.match(/^\s*\d+\.\s+(.+)$/);
        if (orderedListItem) {
            flushParagraph();
            flushList();
            flushTable();
            orderedListItems.push(orderedListItem[1]);
            continue;
        }

        if (isPotentialMarkdownTableLine(line)) {
            flushParagraph();
            flushList();
            flushOrderedList();
            tableLines.push(line);
            continue;
        }

        flushList();
        flushOrderedList();
        flushTable();
        paragraph.push(line.trim());
    }

    if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
    }
    flushBlocks();

    return html.join("");
}

function isPotentialMarkdownTableLine(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isMarkdownTableSeparator(line: string): boolean {
    return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function splitMarkdownTableRow(line: string): string[] {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderInline(value: string): string {
    const escaped = escapeHtml(value);
    return escaped
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
            const safeHref = String(href).startsWith("http") || String(href).startsWith("./") || String(href).startsWith("../")
                ? href
                : "#";
            return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${label}</a>`;
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
