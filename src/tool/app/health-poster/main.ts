(function () {
    const runtime = window as HealthPosterRuntime;
    const logic = runtime.HealthPosterLogic;
    const templates = runtime.HealthPosterTemplates || [];

    if (!logic) {
        throw new Error("Health poster logic failed to initialize");
    }

    if (!templates.length) {
        throw new Error("Health poster templates failed to initialize");
    }

    type AppState = HealthPosterData & {
        templateId: string;
        format: HealthPosterExportFormat;
    };

    const defaultData = logic.createDefaultPosterData();
    const state: AppState = {
        ...defaultData,
        templateId: templates[0].id,
        format: "png"
    };

    function getElement<T extends HTMLElement>(id: string): T {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Missing element: ${id}`);
        }
        return element as T;
    }

    function setText(parent: HTMLElement, selector: string, value: string): void {
        const element = parent.querySelector(selector);
        if (element) element.textContent = value;
    }

    function getSelectedTemplate(): HealthPosterTemplate {
        return templates.find((template) => template.id === state.templateId) || templates[0];
    }

    function renderTemplateOptions(): void {
        const list = getElement<HTMLDivElement>("templateList");
        list.innerHTML = "";

        templates.forEach((template) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = `list-group-item list-group-item-action d-flex align-items-center gap-2 ${template.id === state.templateId ? "active" : ""}`;
            item.innerHTML = `
                <span class="template-swatch" style="--swatch-a:${template.primary};--swatch-b:${template.secondary};--swatch-c:${template.accent}"></span>
                <span class="flex-grow-1 overflow-hidden">
                    <strong class="d-block"></strong>
                    <small class="d-block ${template.id === state.templateId ? "text-white-50" : "text-muted"}"></small>
                </span>
            `;
            setText(item, "strong", template.name);
            setText(item, "small", template.note);
            item.onclick = () => {
                state.templateId = template.id;
                render();
            };
            list.appendChild(item);
        });
    }

    function renderPointEditor(): void {
        const list = getElement<HTMLDivElement>("pointsEditor");
        list.innerHTML = "";

        state.points.forEach((point, index) => {
            const item = document.createElement("div");
            item.className = "card border mb-2";
            item.innerHTML = `
                <div class="card-body p-2">
                    <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
                        <strong></strong>
                        <div class="d-flex gap-1 flex-wrap justify-content-end">
                        <button type="button" class="btn btn-outline-secondary btn-sm move-up">上移</button>
                        <button type="button" class="btn btn-outline-secondary btn-sm move-down">下移</button>
                        <button type="button" class="btn btn-outline-danger btn-sm remove-point">删除</button>
                        </div>
                    </div>
                    <label class="form-label">小标题</label>
                    <input class="form-control form-control-sm point-title" value="">
                    <label class="form-label mt-2">正文</label>
                    <textarea class="form-control form-control-sm point-body" rows="3"></textarea>
                </div>
            `;

            setText(item, "strong", logic.formatKnowledgeLabel(index));
            const titleInput = item.querySelector<HTMLInputElement>(".point-title") as HTMLInputElement;
            const bodyInput = item.querySelector<HTMLTextAreaElement>(".point-body") as HTMLTextAreaElement;
            titleInput.value = point.title;
            bodyInput.value = point.body;

            titleInput.oninput = () => {
                state.points[index].title = titleInput.value;
                renderPoster();
            };
            bodyInput.oninput = () => {
                state.points[index].body = bodyInput.value;
                renderPoster();
            };

            (item.querySelector(".move-up") as HTMLButtonElement).onclick = () => {
                if (index <= 0) return;
                const [current] = state.points.splice(index, 1);
                state.points.splice(index - 1, 0, current);
                render();
            };
            (item.querySelector(".move-down") as HTMLButtonElement).onclick = () => {
                if (index >= state.points.length - 1) return;
                const [current] = state.points.splice(index, 1);
                state.points.splice(index + 1, 0, current);
                render();
            };
            (item.querySelector(".remove-point") as HTMLButtonElement).onclick = () => {
                state.points.splice(index, 1);
                render();
            };

            list.appendChild(item);
        });
    }

    function renderPoster(): void {
        const poster = getElement<HTMLDivElement>("posterCanvas");
        const template = getSelectedTemplate();
        const data = logic.normalizePosterData(state);
        const density = data.points.length >= 7 ? "dense" : data.points.length >= 5 ? "compact" : "normal";

        poster.className = `poster ${template.className}`;
        poster.style.setProperty("--poster-primary", template.primary);
        poster.style.setProperty("--poster-secondary", template.secondary);
        poster.style.setProperty("--poster-accent", template.accent);
        poster.style.setProperty("--poster-bg", template.background);
        poster.dataset.density = density;

        const sections = data.points.map((point, index) => `
            <section class="poster-point">
                <div class="point-number">${String(index + 1).padStart(2, "0")}</div>
                <div class="point-label">${logic.formatKnowledgeLabel(index)}</div>
                <div class="point-content">
                    <h2></h2>
                    <p></p>
                </div>
            </section>
        `).join("");

        poster.innerHTML = `
            <div class="poster-bg-pattern"></div>
            <header class="poster-header">
                <img class="poster-logo" src="../../assets/翼起健康.webp" alt="翼起健康">
                <div class="title-block">
                    <h1></h1>
                    <div class="subtitle-line">
                        <span class="subtitle-mark"></span>
                        <p></p>
                    </div>
                </div>
            </header>
            <main class="poster-points">${sections}</main>
            <footer class="poster-footer"></footer>
        `;

        setText(poster, ".title-block h1", data.title);
        setText(poster, ".subtitle-line p", data.subtitle);
        poster.querySelectorAll<HTMLElement>(".poster-point").forEach((element, index) => {
            const point = data.points[index];
            setText(element, ".point-content h2", point.title || logic.formatKnowledgeLabel(index));
            setText(element, ".point-content p", point.body);
        });
    }

    function render(): void {
        getElement<HTMLInputElement>("titleInput").value = state.title;
        getElement<HTMLInputElement>("subtitleInput").value = state.subtitle;
        getElement<HTMLSelectElement>("formatSelect").value = state.format;
        renderTemplateOptions();
        renderPointEditor();
        renderPoster();
    }

    function downloadBlob(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    async function exportPoster(): Promise<void> {
        const html2canvas = runtime.html2canvas;
        if (!html2canvas) {
            throw new Error("html2canvas 未加载");
        }

        const button = getElement<HTMLButtonElement>("exportButton");
        const originalText = button.textContent || "导出海报";
        button.disabled = true;
        button.textContent = "导出中...";

        try {
            if (document.fonts?.ready) {
                await document.fonts.ready;
            }

            const poster = getElement<HTMLDivElement>("posterCanvas");
            const canvas = await html2canvas(poster, {
                backgroundColor: state.format === "png" ? null : "#ffffff",
                width: logic.posterWidth,
                height: logic.posterHeight,
                scale: 1,
                useCORS: true,
                imageTimeout: 15000
            });

            const mimeType = logic.getMimeType(state.format);
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((result) => {
                    if (result) {
                        resolve(result);
                        return;
                    }
                    reject(new Error("导出图片失败"));
                }, mimeType, state.format === "png" ? undefined : 0.92);
            });
            downloadBlob(blob, logic.createExportFilename(state.title, state.format));
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    function bindEvents(): void {
        getElement<HTMLInputElement>("titleInput").oninput = (event) => {
            state.title = (event.target as HTMLInputElement).value;
            renderPoster();
        };
        getElement<HTMLInputElement>("subtitleInput").oninput = (event) => {
            state.subtitle = (event.target as HTMLInputElement).value;
            renderPoster();
        };
        getElement<HTMLSelectElement>("formatSelect").onchange = (event) => {
            state.format = (event.target as HTMLSelectElement).value as HealthPosterExportFormat;
        };
        getElement<HTMLButtonElement>("addPointButton").onclick = () => {
            state.points.push({ title: "", body: "" });
            render();
        };
        getElement<HTMLButtonElement>("exportButton").onclick = () => {
            exportPoster().catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                alert(message);
            });
        };
    }

    document.addEventListener("DOMContentLoaded", () => {
        bindEvents();
        render();
    });
})();
