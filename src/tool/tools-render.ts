type ThemeMode = "light" | "dark";

type ToolCardItem = ToolItem & {
    category: ToolCategory;
};

type ToggleInstance = {
    getMode(): ThemeMode;
    setMode(mode: ThemeMode): void;
    toggle(): void;
    destroy(): void;
};

type ToggleConstructor = new (
    elements: {
        host: HTMLElement;
        lightLabel: HTMLElement;
        darkLabel: HTMLElement;
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
        defaultMode?: ThemeMode;
        onChange?: (mode: ThemeMode) => void;
    }
) => ToggleInstance;

const allToolItems: ToolCardItem[] = tools.flatMap((section) =>
    section.items.map((item) => ({
        ...item,
        category: section.category
    }))
);

let currentCategory = getInitialCategory();
let toolSearchQuery = "";

ensureCategoryHasItems();

const cardsRoot = document.getElementById("toolCards");
const searchInput = document.getElementById("searchInput");
const categoryLinks = Array.from(document.querySelectorAll<HTMLButtonElement>(".category-link"));
const toggleHost = document.getElementById("toggleButton");
const lightLabel = document.getElementById("lightLabel");
const darkLabel = document.getElementById("darkLabel");
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
    searchInput instanceof HTMLInputElement &&
    toggleHost instanceof HTMLElement &&
    lightLabel instanceof HTMLElement &&
    darkLabel instanceof HTMLElement &&
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
    initThemeToggle();
    renderCurrentView(cardsRoot, searchInput);
}

function initThemeToggle(): void {
    const ToggleClass = window.ThemeToggle as ToggleConstructor | undefined;

    if (!ToggleClass) {
        return;
    }

    new ToggleClass(
        {
            host: toggleHost as HTMLElement,
            lightLabel: lightLabel as HTMLElement,
            darkLabel: darkLabel as HTMLElement,
            skyLayer: skyLayer as HTMLElement,
            starBox: starBox as HTMLElement,
            cloudNear: cloudNear as HTMLElement,
            cloudFar: cloudFar as HTMLElement,
            haloInner: haloInner as HTMLElement,
            haloMiddle: haloMiddle as HTMLElement,
            haloOuter: haloOuter as HTMLElement,
            ball: ball as HTMLElement,
            moon: moon as HTMLElement,
            moonBody: moonBody as HTMLElement
        },
        {
            defaultMode: getCurrentTheme()
        }
    );
}

function getCurrentTheme(): ThemeMode {
    const theme = window.OhmyflightTheme?.getTheme();
    return theme === "dark" ? "dark" : "light";
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
            if (cardsRoot instanceof HTMLElement && searchInput instanceof HTMLInputElement) {
                renderCurrentView(cardsRoot, searchInput);
            }
            syncQueryState();
        });
    });
}

function bindSearchInput(input: HTMLInputElement): void {
    syncSearchInput(input);

    input.addEventListener("input", () => {
        toolSearchQuery = input.value.trim();

        if (cardsRoot instanceof HTMLElement) {
            renderCurrentView(cardsRoot, input);
        }
    });
}

function syncSearchInput(input: HTMLInputElement): void {
    input.value = toolSearchQuery;
    input.placeholder = "搜索工具";
    input.setAttribute("aria-label", "搜索工具");
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

function matchesSearch(item: { name: string; desc: string }, query: string): boolean {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
        return true;
    }

    return `${item.name} ${item.desc}`.toLowerCase().includes(normalizedQuery);
}

function renderCurrentView(cardsContainer: HTMLElement, input: HTMLInputElement): void {
    syncSearchInput(input);
    syncCategoryTabs();
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

function syncQueryState(): void {
    if (typeof history.replaceState !== "function") {
        return;
    }

    const params = new URLSearchParams();

    if (currentCategory !== "common") {
        params.set("category", currentCategory);
    }

    const nextUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

    history.replaceState(null, "", nextUrl);
}
