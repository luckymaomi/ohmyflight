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
const toolsView = document.getElementById("toolsView");
const workflowView = document.getElementById("workflowView");
const workflowList = document.getElementById("workflowList");
const categorySwitch = document.getElementById("categorySwitch");
const imperialOverlay = document.getElementById("imperialOverlay");
const announcementBanner = document.getElementById("announcementBanner");
const announcementMessage = document.getElementById("announcementMessage");
const announcementLink = document.getElementById("announcementLink");
const announcementCta = document.getElementById("announcementCta");
type HomepageCategory = ToolCategory | "all" | "workflow";

const configuredDefaultCategory = categorySwitch instanceof HTMLElement
    ? categorySwitch.dataset.defaultCategory
    : undefined;
let activeCategory: HomepageCategory = isHomepageCategory(configuredDefaultCategory)
    ? configuredDefaultCategory
    : "all";
let overlayResetTimer: number | undefined;
let expansionDelayTimer: number | undefined;
let workflowAnimationGeneration = 0;

renderAnnouncement();

if (
    searchInput instanceof HTMLInputElement
    && toolGrid instanceof HTMLElement
    && emptyState instanceof HTMLElement
    && toolsView instanceof HTMLElement
    && workflowView instanceof HTMLElement
    && workflowList instanceof HTMLElement
) {
    renderCategoryCounts();
    renderCurrentView();
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
        .map((item, index) => renderToolCard(item, index, "tool-card"))
        .join("");

    emptyState.hidden = rows.length > 0;
    bindToolHoverEffects();
}

function renderToolCard(item: ToolItem, index: number, className: string): string {
    return `
        <a class="${className}"
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
    `;
}

function renderWorkflowRows(): void {
    if (!(workflowList instanceof HTMLElement) || !(emptyState instanceof HTMLElement)) return;

    const query = searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : "";
    const toolMap = new Map(allToolRows.map((item) => [item.entry, item]));
    const visibleWorkflows = workflows
        .filter((workflow) => siteVisibility.workflows[workflow.id] === true)
        .map((workflow) => ({
            ...workflow,
            items: workflow.entries
                .map((entry) => toolMap.get(entry))
                .filter((item): item is ToolItem => Boolean(item))
                .filter((item) => !query || `${item.name} ${item.desc}`.toLowerCase().includes(query))
        }))
        .filter((workflow) => workflow.items.length > 0);

    workflowList.innerHTML = visibleWorkflows.map((workflow, index) => `
        <section class="workflow-row" style="--i:${index}" aria-labelledby="workflow-${index}">
            <h2 class="workflow-title" id="workflow-${index}">${escapeHtml(workflow.name)}</h2>
            <div class="workflow-canvas">
                <div class="workflow-chain">
                    ${workflow.items.map((item, itemIndex) => `
                        ${renderToolCard(item, itemIndex, "workflow-node")}
                        ${itemIndex < workflow.items.length - 1 ? `
                            <span class="workflow-edge" aria-hidden="true">
                                <span class="edge-line"></span>
                                <span class="edge-particle"></span>
                            </span>
                        ` : ""}
                    `).join("")}
                </div>
            </div>
        </section>
    `).join("");

    emptyState.hidden = visibleWorkflows.length > 0;
    startWorkflowAnimations();
}

function startWorkflowAnimations(): void {
    workflowAnimationGeneration += 1;
    const generation = workflowAnimationGeneration;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.querySelectorAll<HTMLElement>(".workflow-row").forEach((row) => {
        void runWorkflowAnimation(row, generation);
    });
}

async function runWorkflowAnimation(row: HTMLElement, generation: number): Promise<void> {
    const edges = Array.from(row.querySelectorAll<HTMLElement>(".workflow-edge"));
    const nodes = Array.from(row.querySelectorAll<HTMLElement>(".workflow-node"));
    if (!edges.length || nodes.length < 2) return;

    while (generation === workflowAnimationGeneration && row.isConnected) {
        nodes.forEach((node) => node.classList.remove("is-flow-hit"));
        for (let index = 0; index < edges.length; index += 1) {
            if (generation !== workflowAnimationGeneration || !row.isConnected) return;
            await animateWorkflowEdge(edges[index]);
            const target = nodes[index + 1];
            target?.classList.remove("is-flow-hit");
            target?.getBoundingClientRect();
            target?.classList.add("is-flow-hit");
            await waitForWorkflow(360);
        }
        await waitForWorkflow(1100);
    }
}

async function animateWorkflowEdge(edge: HTMLElement): Promise<void> {
    const particle = edge.querySelector<HTMLElement>(".edge-particle");
    if (!particle) return;

    const vertical = window.matchMedia("(max-width: 980px)").matches;
    const distance = vertical
        ? Math.max(0, edge.clientHeight - 12)
        : Math.max(0, edge.clientWidth - 12);
    const keyframes: Keyframe[] = vertical
        ? [
            { opacity: 0, transform: "translate3d(-50%, 0, 0)" },
            { opacity: 1, transform: `translate3d(-50%, ${distance * 0.12}px, 0)`, offset: 0.12 },
            { opacity: 1, transform: `translate3d(-50%, ${distance * 0.88}px, 0)`, offset: 0.88 },
            { opacity: 0, transform: `translate3d(-50%, ${distance}px, 0)` }
        ]
        : [
            { opacity: 0, transform: "translate3d(0, -50%, 0)" },
            { opacity: 1, transform: `translate3d(${distance * 0.12}px, -50%, 0)`, offset: 0.12 },
            { opacity: 1, transform: `translate3d(${distance * 0.88}px, -50%, 0)`, offset: 0.88 },
            { opacity: 0, transform: `translate3d(${distance}px, -50%, 0)` }
        ];
    const animation = particle.animate(keyframes, {
        duration: 2100,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "none"
    });
    await animation.finished.catch(() => undefined);
}

function waitForWorkflow(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
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
    renderCurrentView();
}

function renderCurrentView(): void {
    if (
        !(searchInput instanceof HTMLInputElement)
        || !(toolsView instanceof HTMLElement)
        || !(workflowView instanceof HTMLElement)
        || !(emptyState instanceof HTMLElement)
    ) return;

    const showingWorkflow = activeCategory === "workflow";
    toolsView.hidden = showingWorkflow;
    toolsView.inert = showingWorkflow;
    workflowView.hidden = !showingWorkflow;
    workflowView.inert = !showingWorkflow;

    syncCategoryButtons();
    if (showingWorkflow) {
        renderWorkflowRows();
        return;
    }

    workflowAnimationGeneration += 1;

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
        if (!isHomepageCategory(category)) return;

        activeCategory = category;
        renderCurrentView();
    });
}

function isToolCategory(value: unknown): value is ToolCategory {
    return value === "heavy" || value === "light" || value === "automation";
}

function isHomepageCategory(value: unknown): value is HomepageCategory {
    return value === "all" || value === "workflow" || isToolCategory(value);
}

function syncCategoryButtons(): void {
    if (!(categorySwitch instanceof HTMLElement)) return;
    categorySwitch.querySelectorAll<HTMLButtonElement>("[data-category]").forEach((candidate) => {
        const isActive = candidate.dataset.category === activeCategory;
        candidate.classList.toggle("active", isActive);
        candidate.setAttribute("aria-pressed", String(isActive));
    });
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
