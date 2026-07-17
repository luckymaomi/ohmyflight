const allToolRows: ToolItem[] = Array.isArray(tools)
    ? tools.filter((item) => siteVisibility.tools[item.entry] === true)
    : [];
const categoryLabels: Record<ToolCategory, string> = {
    heavy: "重型",
    light: "轻型",
    automation: "自动化"
};

const searchInput = document.getElementById("searchInput");
const toolGrid = document.getElementById("toolGrid");
const emptyState = document.getElementById("emptyState");
const categorySwitch = document.getElementById("categorySwitch");
const imperialOverlay = document.getElementById("imperialOverlay");
const announcementBanner = document.getElementById("announcementBanner");
const announcementMessage = document.getElementById("announcementMessage");
const announcementLink = document.getElementById("announcementLink");
const announcementCta = document.getElementById("announcementCta");
const configuredDefaultCategory = categorySwitch instanceof HTMLElement
    ? categorySwitch.dataset.defaultCategory
    : undefined;
let activeCategory: ToolCategory | "all" = isToolCategory(configuredDefaultCategory)
    ? configuredDefaultCategory
    : "all";
let overlayResetTimer: number | undefined;
let expansionDelayTimer: number | undefined;

renderAnnouncement();

if (
    searchInput instanceof HTMLInputElement
    && toolGrid instanceof HTMLElement
    && emptyState instanceof HTMLElement
) {
    renderCategoryCounts();
    applyFilters();
    bindSearch(searchInput);
    bindCategorySwitch();
    bindSearchShortcut(searchInput);
}

function bindSearch(input: HTMLInputElement): void {
    input.addEventListener("input", applyFilters);
}

function renderAnnouncement(): void {
    if (
        !(announcementBanner instanceof HTMLElement)
        || !(announcementMessage instanceof HTMLElement)
        || typeof announcement !== "object"
        || siteVisibility.homepage.announcement !== true
    ) return;

    announcementMessage.textContent = announcement.message;
    const sponsorLinkEnabled = siteVisibility.homepage.sponsorEntry === true && Boolean(announcement.href);
    if (announcementLink instanceof HTMLAnchorElement) {
        announcementLink.classList.toggle("is-clickable", sponsorLinkEnabled);
        if (sponsorLinkEnabled && announcement.href) {
            announcementLink.href = announcement.href;
            announcementLink.target = "_blank";
            announcementLink.rel = "noopener noreferrer";
        } else {
            announcementLink.removeAttribute("href");
            announcementLink.removeAttribute("target");
            announcementLink.removeAttribute("rel");
        }
    }
    if (announcementCta instanceof HTMLElement) announcementCta.hidden = !sponsorLinkEnabled;
    announcementBanner.hidden = false;
}

function renderToolCards(rows: ToolItem[]): void {
    if (!(toolGrid instanceof HTMLElement) || !(emptyState instanceof HTMLElement)) return;

    toolGrid.innerHTML = rows
        .map((item, index) => `
            <a class="tool-card"
                style="--i:${index}"
                href="${escapeHtml(resolveToolUrl(item))}"
                target="_blank"
                rel="noopener noreferrer">
                <span class="tool-image" aria-hidden="true">
                    <img src="./assets/status-done.png" alt="">
                </span>
                <span class="tool-copy">
                    <span class="tool-name">${escapeHtml(item.name)}</span>
                    <span class="tool-desc">${escapeHtml(item.desc)}</span>
                </span>
            </a>
        `)
        .join("");

    emptyState.hidden = rows.length > 0;
    bindToolHoverEffects();
}

function bindToolHoverEffects(): void {
    if (!(toolGrid instanceof HTMLElement) || !(imperialOverlay instanceof HTMLElement)) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    toolGrid.querySelectorAll<HTMLElement>(".tool-card").forEach((card) => {
        card.addEventListener("pointerenter", () => scheduleImperialExpansion(card));
        card.addEventListener("pointerleave", stopImperialExpansion);
    });
}

function scheduleImperialExpansion(card: HTMLElement): void {
    if (expansionDelayTimer !== undefined) window.clearTimeout(expansionDelayTimer);
    expansionDelayTimer = window.setTimeout(() => {
        expansionDelayTimer = undefined;
        startImperialExpansion(card);
    }, 10_000);
}

function startImperialExpansion(card: HTMLElement): void {
    if (!(imperialOverlay instanceof HTMLElement)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (overlayResetTimer !== undefined) {
        window.clearTimeout(overlayResetTimer);
        overlayResetTimer = undefined;
    }

    const rect = card.getBoundingClientRect();
    imperialOverlay.className = "imperial-overlay";
    imperialOverlay.style.left = `${rect.left}px`;
    imperialOverlay.style.top = `${rect.top}px`;
    imperialOverlay.style.width = `${rect.width}px`;
    imperialOverlay.style.height = `${rect.height}px`;
    imperialOverlay.getBoundingClientRect();
    imperialOverlay.classList.add("is-growing");
}

function stopImperialExpansion(): void {
    if (!(imperialOverlay instanceof HTMLElement)) return;
    if (expansionDelayTimer !== undefined) {
        window.clearTimeout(expansionDelayTimer);
        expansionDelayTimer = undefined;
    }
    imperialOverlay.classList.remove("is-growing");
    imperialOverlay.classList.add("is-returning");
    overlayResetTimer = window.setTimeout(() => {
        imperialOverlay.className = "imperial-overlay";
        imperialOverlay.removeAttribute("style");
        overlayResetTimer = undefined;
    }, 260);
}

function applyFilters(): void {
    if (!(searchInput instanceof HTMLInputElement)) return;
    const query = searchInput.value.trim().toLowerCase();
    const rows = allToolRows.filter((item) => {
        const categoryMatches = activeCategory === "all" || item.category === activeCategory;
        const queryMatches = !query
            || `${item.name} ${item.desc} ${categoryLabels[item.category]}`.toLowerCase().includes(query);
        return categoryMatches && queryMatches;
    });
    renderToolCards(rows);
}

function renderCategoryCounts(): void {
    document.querySelectorAll<HTMLElement>("[data-category-count]").forEach((element) => {
        const category = element.dataset.categoryCount as ToolCategory | "all" | undefined;
        element.textContent = String(category === "all"
            ? allToolRows.length
            : allToolRows.filter((item) => item.category === category).length);
    });
}

function bindCategorySwitch(): void {
    if (!(categorySwitch instanceof HTMLElement)) return;
    categorySwitch.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const button = target.closest<HTMLButtonElement>("[data-category]");
        if (!button) return;
        const category = button.dataset.category;
        if (category !== "all" && !isToolCategory(category)) return;

        activeCategory = category;
        categorySwitch.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((candidate) => {
            const isActive = candidate === button;
            candidate.classList.toggle("active", isActive);
            candidate.setAttribute("aria-pressed", String(isActive));
        });
        applyFilters();
    });
}

function isToolCategory(value: unknown): value is ToolCategory {
    return value === "heavy" || value === "light" || value === "automation";
}

function bindSearchShortcut(input: HTMLInputElement): void {
    document.addEventListener("keydown", (event) => {
        if (event.key === "/" && document.activeElement !== input) {
            const active = document.activeElement;
            if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
            event.preventDefault();
            input.focus();
            return;
        }

        if (event.key === "Escape" && document.activeElement === input) {
            input.value = "";
            input.blur();
            applyFilters();
        }
    });
}

function resolveToolUrl(item: ToolItem): string {
    return `./app/${item.entry}/index.html`;
}

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
