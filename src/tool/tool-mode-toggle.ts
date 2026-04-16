type ToggleMode = "tool" | "workflow";

interface ToggleElements {
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
}

interface ToggleOptions {
    defaultMode?: ToggleMode;
    onChange?: (mode: ToggleMode) => void;
}

interface ToggleStar {
    size: number;
    top: string;
    left: string;
}

interface ToggleCloud {
    size: number;
    top: string;
    right: string;
}

class ToolModeToggle {
    private readonly host: HTMLElement;
    private readonly toolLabel: HTMLElement;
    private readonly workflowLabel: HTMLElement;
    private readonly skyLayer: HTMLElement;
    private readonly starBox: HTMLElement;
    private readonly cloudNear: HTMLElement;
    private readonly cloudFar: HTMLElement;
    private readonly haloInner: HTMLElement;
    private readonly haloMiddle: HTMLElement;
    private readonly haloOuter: HTMLElement;
    private readonly ball: HTMLElement;
    private readonly moon: HTMLElement;
    private readonly moonBody: HTMLElement;
    private readonly onChange: (mode: ToggleMode) => void;

    private mode: ToggleMode;
    private motionTimer = 0;
    private nightEffectTimer = 0;
    private twinkleTimer = 0;
    private activeTwinkles = [1, 4];
    private meteor: HTMLElement | null = null;

    private readonly stars: ToggleStar[] = [
        { size: 1.5, top: "13%", left: "20%" },
        { size: 0.5, top: "28%", left: "10%" },
        { size: 0.7, top: "43%", left: "22%" },
        { size: 0.3, top: "68%", left: "15%" },
        { size: 0.2, top: "75%", left: "11%" },
        { size: 0.4, top: "78%", left: "22%" },
        { size: 1.3, top: "21%", left: "53%" },
        { size: 0.4, top: "20%", left: "42%" },
        { size: 0.4, top: "48%", left: "37%" },
        { size: 0.6, top: "53%", left: "52%" },
        { size: 0.8, top: "73%", left: "46%" }
    ];

    private readonly nearClouds: ToggleCloud[] = [
        { size: 1.2, top: "15%", right: "-13%" },
        { size: 1.3, top: "39%", right: "-5%" },
        { size: 1.0, top: "66%", right: "5%" },
        { size: 1.5, top: "80%", right: "26%" },
        { size: 1.2, top: "75%", right: "38%" },
        { size: 1.3, top: "83%", right: "55%" },
        { size: 1.3, top: "89%", right: "68%" }
    ];

    private readonly farClouds: ToggleCloud[] = [
        { size: 1.2, top: "2%", right: "-5%" },
        { size: 1.4, top: "25%", right: "5%" },
        { size: 1.0, top: "37%", right: "10%" },
        { size: 1.5, top: "58%", right: "30%" },
        { size: 1.2, top: "55%", right: "38%" },
        { size: 1.3, top: "70%", right: "57%" },
        { size: 1.1, top: "77%", right: "66%" }
    ];

    constructor(elements: ToggleElements, options: ToggleOptions = {}) {
        this.host = elements.host;
        this.toolLabel = elements.toolLabel;
        this.workflowLabel = elements.workflowLabel;
        this.skyLayer = elements.skyLayer;
        this.starBox = elements.starBox;
        this.cloudNear = elements.cloudNear;
        this.cloudFar = elements.cloudFar;
        this.haloInner = elements.haloInner;
        this.haloMiddle = elements.haloMiddle;
        this.haloOuter = elements.haloOuter;
        this.ball = elements.ball;
        this.moon = elements.moon;
        this.moonBody = elements.moonBody;
        this.mode = options.defaultMode || "tool";
        this.onChange = options.onChange || (() => undefined);

        this.host.setAttribute("role", "button");
        this.host.setAttribute("tabindex", "0");
        this.host.setAttribute("aria-label", "切换工具与工作流");

        this.buildStars();
        this.buildClouds(this.cloudNear, this.nearClouds, "--near-cloud-size");
        this.buildClouds(this.cloudFar, this.farClouds, "--far-cloud-size");
        this.bindEvents();
        this.applyMode(false);
    }

    getMode(): ToggleMode {
        return this.mode;
    }

    setMode(mode: ToggleMode): void {
        if (mode === this.mode) {
            return;
        }

        this.mode = mode;
        this.applyMode();
    }

    toggle(): void {
        this.setMode(this.mode === "tool" ? "workflow" : "tool");
    }

    destroy(): void {
        window.clearTimeout(this.motionTimer);
        window.clearTimeout(this.nightEffectTimer);
        window.clearInterval(this.twinkleTimer);
    }

    private bindEvents(): void {
        this.host.addEventListener("click", () => {
            this.toggle();
        });

        this.host.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }

            event.preventDefault();
            this.toggle();
        });
    }

    private buildStars(): void {
        this.starBox.innerHTML = "";

        this.stars.forEach((star, index) => {
            const node = document.createElement("div");
            node.className = "star";
            node.dataset.index = String(index);
            node.style.height = `calc(var(--star-size) * ${star.size})`;
            node.style.width = `calc(var(--star-size) * ${star.size})`;
            node.style.top = star.top;
            node.style.left = star.left;
            node.innerHTML = `
                <svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M50,0 C62.5,37.5 62.5,37.5 100,50 C62.5,62.5 62.5,62.5 50,100 C37.5,62.5 37.5,62.5 0,50 C37.5,37.5 37.5,37.5 50,0" fill="white" />
                </svg>
            `;
            this.starBox.appendChild(node);
        });

        this.meteor = document.createElement("div");
        this.meteor.className = "meteor";
        this.starBox.appendChild(this.meteor);
    }

    private buildClouds(container: HTMLElement, clouds: ToggleCloud[], sizeVarName: string): void {
        container.innerHTML = "";

        clouds.forEach((cloud, index) => {
            const node = document.createElement("div");
            node.className = "cloud";
            node.style.height = `calc(var(${sizeVarName}) / ${cloud.size})`;
            node.style.width = `calc(var(${sizeVarName}) / ${cloud.size})`;
            node.style.top = cloud.top;
            node.style.right = cloud.right;
            node.style.animationDelay = `${index * 0.28}s`;
            container.appendChild(node);
        });
    }

    private applyMode(shouldNotify = true): void {
        const workflowMode = this.mode === "workflow";

        document.body.classList.toggle("workflow-mode", workflowMode);
        this.host.dataset.mode = this.mode;
        this.host.dataset.motion = workflowMode ? "to-workflow" : "to-tool";
        this.host.setAttribute("aria-pressed", String(workflowMode));

        this.toolLabel.classList.toggle("muted", workflowMode);
        this.workflowLabel.classList.toggle("muted", !workflowMode);

        this.skyLayer.classList.toggle("night", workflowMode);
        this.skyLayer.classList.toggle("day", !workflowMode);
        this.starBox.classList.toggle("is-active", workflowMode);
        this.cloudNear.classList.toggle("is-hidden", workflowMode);
        this.cloudFar.classList.toggle("is-hidden", workflowMode);
        this.ball.classList.toggle("to-right", workflowMode);
        this.ball.classList.toggle("to-left", !workflowMode);
        this.moon.classList.toggle("moon-cut-in", workflowMode);

        this.syncHalo(this.haloInner, workflowMode);
        this.syncHalo(this.haloMiddle, workflowMode);
        this.syncHalo(this.haloOuter, workflowMode);

        window.clearTimeout(this.motionTimer);
        this.motionTimer = window.setTimeout(() => {
            this.host.dataset.motion = "steady";
        }, 1500);

        if (workflowMode) {
            this.startNightEffects();
        } else {
            this.stopNightEffects();
        }

        if (shouldNotify) {
            this.onChange(this.mode);
        }
    }

    private syncHalo(element: HTMLElement, workflowMode: boolean): void {
        element.classList.toggle("halo-right", workflowMode);
        element.classList.toggle("halo-left", !workflowMode);
    }

    private startNightEffects(): void {
        this.stopNightEffects();

        this.nightEffectTimer = window.setTimeout(() => {
            if (this.mode !== "workflow") {
                return;
            }

            this.moonBody.classList.add("moon-rotate");
            this.meteor?.classList.add("meteor-fall");
            this.refreshTwinkles();

            this.twinkleTimer = window.setInterval(() => {
                this.activeTwinkles = this.activeTwinkles.map((index) => (index + 3) % this.stars.length);
                this.refreshTwinkles();
            }, 1200);
        }, 180);
    }

    private stopNightEffects(): void {
        window.clearTimeout(this.nightEffectTimer);
        window.clearInterval(this.twinkleTimer);
        this.moonBody.classList.remove("moon-rotate");
        this.meteor?.classList.remove("meteor-fall");
        this.activeTwinkles = [1, 4];
        this.refreshTwinkles();
    }

    private refreshTwinkles(): void {
        this.starBox.querySelectorAll<HTMLElement>(".star").forEach((star) => {
            const index = Number(star.dataset.index || "0");
            star.classList.toggle("twinkle", this.mode === "workflow" && this.activeTwinkles.includes(index));
        });
    }
}

(window as Window & { ToolModeToggle?: typeof ToolModeToggle }).ToolModeToggle = ToolModeToggle;
