type ToolPageMode = "tool" | "workflow";

type ToolCardItem = ToolItem & {
    category: ToolCategory;
};

type WorkflowCardItem = WorkflowItem;

type ToggleInstance = {
    getMode(): ToolPageMode;
    setMode(mode: ToolPageMode): void;
    toggle(): void;
    destroy(): void;
};

type ToggleConstructor = new (
    elements: {
        host: HTMLElement;
        toolLabel: HTMLElement;
        workflowLabel: HTMLElement;
        skyLayer: HTMLElement;
        starBox: HTMLElement;
        cloudNear: HTMLElement;
        cloudFar: HTMLElement;
        haloInner: HTMLElement;
        haloMiddle: HTMLElement;
        haloOuter: HTMLElement;
        ball: HTMLElement;
        moon: HTMLElement;
        moonBody: HTMLElement;
    },
    options?: {
        defaultMode?: ToolPageMode;
        onChange?: (mode: ToolPageMode) => void;
    }
) => ToggleInstance;

const allToolItems: ToolCardItem[] = tools.flatMap((section) =>
    section.items.map((item) => ({
        ...item,
        category: section.category
    }))
);
const allWorkflowItems: WorkflowCardItem[] = window.workflows || [];

let currentMode = getInitialMode();
let currentCategory = getInitialCategory();
let toolSearchQuery = "";
let workflowSearchQuery = "";

ensureCategoryHasItems();

const cardsRoot = document.getElementById("toolCards");
const toolsView = document.getElementById("toolsView");
const workflowPlaceholder = document.getElementById("workflowPlaceholder");
const searchInput = document.getElementById("searchInput");
const categoryLinks = Array.from(document.querySelectorAll<HTMLButtonElement>(".category-link"));
const toggleHost = document.getElementById("toggleButton");
const toolLabel = document.getElementById("toolLabel");
const workflowLabel = document.getElementById("workflowLabel");
const skyLayer = document.getElementById("skyLayer");
const starBox = document.getElementById("starBox");
const cloudNear = document.getElementById("cloudNear");
const cloudFar = document.getElementById("cloudFar");
const haloInner = document.getElementById("haloInner");
const haloMiddle = document.getElementById("haloMiddle");
const haloOuter = document.getElementById("haloOuter");
const ball = document.getElementById("ball");
const moon = document.getElementById("moon");
const moonBody = document.getElementById("moonBody");

if (
    cardsRoot instanceof HTMLElement &&
    toolsView instanceof HTMLElement &&
    workflowPlaceholder instanceof HTMLElement &&
    searchInput instanceof HTMLInputElement &&
    toggleHost instanceof HTMLElement &&
    toolLabel instanceof HTMLElement &&
    workflowLabel instanceof HTMLElement &&
    skyLayer instanceof HTMLElement &&
    starBox instanceof HTMLElement &&
    cloudNear instanceof HTMLElement &&
    cloudFar instanceof HTMLElement &&
    haloInner instanceof HTMLElement &&
    haloMiddle instanceof HTMLElement &&
    haloOuter instanceof HTMLElement &&
    ball instanceof HTMLElement &&
    moon instanceof HTMLElement &&
    moonBody instanceof HTMLElement
) {
    bindSearchInput(searchInput);
    bindCategoryTabs();

    const ToggleClass = (window as Window & { ToolModeToggle?: ToggleConstructor }).ToolModeToggle;

    if (ToggleClass) {
        new ToggleClass(
            {
                host: toggleHost,
                toolLabel,
                workflowLabel,
                skyLayer,
                starBox,
                cloudNear,
                cloudFar,
                haloInner,
                haloMiddle,
                haloOuter,
                ball,
                moon,
                moonBody
            },
            {
                defaultMode: currentMode,
                onChange: (mode) => {
                    currentMode = mode;
                    ensureCategoryHasItems();
                    renderCurrentView(cardsRoot, toolsView, workflowPlaceholder, searchInput);
                }
            }
        );
    }

    renderCurrentView(cardsRoot, toolsView, workflowPlaceholder, searchInput);
}

function getInitialMode(): ToolPageMode {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "workflow" ? "workflow" : "tool";
}

function getInitialCategory(): ToolCategory {
    const params = new URLSearchParams(window.location.search);
    return params.get("category") === "other" ? "other" : "common";
}

function bindCategoryTabs(): void {
    categoryLinks.forEach((link) => {
        link.addEventListener("click", () => {
            currentCategory = link.dataset.category === "other" ? "other" : "common";
            syncCategoryTabs();
            if (
                cardsRoot instanceof HTMLElement &&
                toolsView instanceof HTMLElement &&
                workflowPlaceholder instanceof HTMLElement &&
                searchInput instanceof HTMLInputElement
            ) {
                renderCurrentView(cardsRoot, toolsView, workflowPlaceholder, searchInput);
            }
            syncQueryState();
        });
    });
}

function bindSearchInput(input: HTMLInputElement): void {
    syncSearchInput(input);

    input.addEventListener("input", () => {
        if (currentMode === "workflow") {
            workflowSearchQuery = input.value.trim();
        } else {
            toolSearchQuery = input.value.trim();
        }

        if (
            cardsRoot instanceof HTMLElement &&
            toolsView instanceof HTMLElement &&
            workflowPlaceholder instanceof HTMLElement
        ) {
            renderCurrentView(cardsRoot, toolsView, workflowPlaceholder, input);
        }
    });
}

function syncSearchInput(input: HTMLInputElement): void {
    const isWorkflow = currentMode === "workflow";
    const activeValue = isWorkflow ? workflowSearchQuery : toolSearchQuery;
    const placeholder = isWorkflow ? "搜索工作流" : "搜索工具";

    input.value = activeValue;
    input.placeholder = placeholder;
    input.setAttribute("aria-label", placeholder);
}

function syncCategoryTabs(): void {
    const searchActive = toolSearchQuery.length > 0;

    categoryLinks.forEach((link) => {
        const isActive = link.dataset.category === currentCategory;
        link.classList.toggle("active", isActive);
        link.classList.toggle("is-passive", searchActive);
        link.setAttribute("aria-pressed", String(isActive));
    });
}

function ensureCategoryHasItems(): void {
    if (toolSearchQuery) {
        return;
    }

    if (getVisibleItems().length > 0) {
        return;
    }

    currentCategory = currentCategory === "common" ? "other" : "common";
}

function getVisibleItems(): ToolCardItem[] {
    if (toolSearchQuery) {
        return allToolItems.filter((item) => matchesSearch(item, toolSearchQuery));
    }

    return allToolItems.filter((item) => item.category === currentCategory);
}

function getVisibleWorkflowItems(): WorkflowCardItem[] {
    if (!workflowSearchQuery) {
        return allWorkflowItems;
    }

    return allWorkflowItems.filter((item) => matchesSearch(item, workflowSearchQuery));
}

function matchesSearch(item: { name: string; desc: string }, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return true;
    }

    return `${item.name} ${item.desc}`.toLowerCase().includes(normalizedQuery);
}

function syncModeSections(toolsViewRoot: HTMLElement, workflowRoot: HTMLElement): void {
    const isWorkflow = currentMode === "workflow";
    toolsViewRoot.hidden = isWorkflow;
    workflowRoot.hidden = !isWorkflow;
}

function renderCurrentView(
    cardsContainer: HTMLElement,
    toolsViewRoot: HTMLElement,
    workflowRoot: HTMLElement,
    input: HTMLInputElement
): void {
    syncModeSections(toolsViewRoot, workflowRoot);
    syncSearchInput(input);
    syncCategoryTabs();

    if (currentMode === "workflow") {
        cardsContainer.innerHTML = "";
        renderWorkflowPlaceholder(workflowRoot);
        syncQueryState();
        return;
    }

    renderToolCards(cardsContainer);
    syncQueryState();
}

function renderToolCards(container: HTMLElement): void {
    const visibleItems = getVisibleItems();

    if (!visibleItems.length) {
        container.innerHTML = `<div class="empty-state">${getToolEmptyMessage()}</div>`;
        return;
    }

    container.innerHTML = visibleItems.map((item) => {
        const url = resolveToolUrl(item);
        return `
            <a href="${url}" target="_blank" rel="noreferrer" class="card">
                <div>
                    <h3>${item.name}</h3>
                    <p>${item.desc}</p>
                </div>
            </a>
        `;
    }).join("");
}

function renderWorkflowPlaceholder(container: HTMLElement): void {
    const visibleItems = getVisibleWorkflowItems();

    if (!visibleItems.length) {
        container.innerHTML = "<strong>尚未接入</strong>";
        return;
    }

    container.innerHTML = visibleItems.map((item) => {
        const url = resolveWorkflowUrl(item);
        return `
            <a href="${url}" target="_blank" rel="noreferrer" class="card">
                <div>
                    <h3>${item.name}</h3>
                    <p>${item.desc}</p>
                </div>
            </a>
        `;
    }).join("");
}

function getToolEmptyMessage(): string {
    return toolSearchQuery ? "未找到相关工具" : "当前分类下没有可显示内容";
}

function resolveToolUrl(item: ToolItem): string {
    if (item.url) {
        return item.url;
    }

    if (item.entry) {
        return `./app/${item.entry}/index.html`;
    }

    return "#";
}

function resolveWorkflowUrl(item: WorkflowItem): string {
    if (item.url) {
        return item.url;
    }

    if (item.entry) {
        return `./workflow/${item.entry}/index.html`;
    }

    return "#";
}

function syncQueryState(): void {
    if (typeof history.replaceState !== "function") {
        return;
    }

    const params = new URLSearchParams();

    if (currentMode !== "tool") {
        params.set("mode", currentMode);
    }

    if (currentCategory !== "common") {
        params.set("category", currentCategory);
    }

    const nextUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

    history.replaceState(null, "", nextUrl);
}
