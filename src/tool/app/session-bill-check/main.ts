(function () {
    const runtime = window as SessionBillRuntime;
    const logic = runtime.SessionBillLogic;
    const XLSX = runtime.XLSX;

    if (!logic) {
        throw new Error("Session bill logic failed to initialize");
    }

    type AppState = {
        sessionWorkbook: SessionBillWorkbook | null;
        billWorkbook: SessionBillWorkbook | null;
        sessionFileName: string;
        billFileName: string;
        sessionAnalysis: ReturnType<SessionBillLogicApi["analyzeSessionWorkbook"]> | null;
        billAnalysis: ReturnType<SessionBillLogicApi["analyzeBillWorkbook"]> | null;
        result: SessionBillCompareResult | null;
        filter: string;
        selectedKey: string;
    };

    const state: AppState = {
        sessionWorkbook: null,
        billWorkbook: null,
        sessionFileName: "",
        billFileName: "",
        sessionAnalysis: null,
        billAnalysis: null,
        result: null,
        filter: "diff",
        selectedKey: ""
    };

    function getElement<T extends HTMLElement>(id: string): T {
        const element = document.getElementById(id);
        if (!element) throw new Error(`Missing element: ${id}`);
        return element as T;
    }

    function escapeHtml(value: unknown): string {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function setStatus(message: string, type: "muted" | "success" | "danger" = "muted"): void {
        const status = getElement<HTMLDivElement>("statusLine");
        status.textContent = message;
        status.className = `small mt-2 text-${type === "danger" ? "danger" : type === "success" ? "success" : "muted"}`;
    }

    function readWorkbook(file: File): Promise<SessionBillWorkbook> {
        return file.arrayBuffer().then((buffer) => XLSX.read(buffer, {
            type: "array",
            cellFormula: true,
            cellStyles: true,
            cellDates: false
        }));
    }

    function renderFileInfo(): void {
        const sessionText = state.sessionAnalysis
            ? `场次表：${state.sessionFileName}；sheet ${state.sessionAnalysis.sheetName}；拆分 ${state.sessionAnalysis.entries.length} 人次`
            : "场次表：未上传";
        const billText = state.billAnalysis
            ? `账单表：${state.billFileName}；sheet ${state.billAnalysis.sheetNames.join("、")}；读取 ${state.billAnalysis.entries.length} 人次`
            : "账单表：未上传";
        getElement<HTMLDivElement>("fileInfo").innerHTML = `
            <div>${escapeHtml(sessionText)}</div>
            <div>${escapeHtml(billText)}</div>
        `;
    }

    function renderSummary(): void {
        const summary = state.result?.summary;
        const cards = summary
            ? [
                ["场次总人次", summary.sessionTotal],
                ["账单总人次", summary.billTotal],
                ["参与核对姓名", summary.comparedNames],
                ["一致姓名", summary.matchedNames],
                ["差异姓名", summary.mismatchNames]
            ]
            : [
                ["场次总人次", "-"],
                ["账单总人次", "-"],
                ["参与核对姓名", "-"],
                ["一致姓名", "-"],
                ["差异姓名", "-"]
            ];

        getElement<HTMLDivElement>("summaryGrid").innerHTML = cards.map(([label, value]) => `
            <article class="summary-card">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
            </article>
        `).join("");
    }

    function renderCharts(): void {
        const result = state.result;
        const chartElement = getElement<HTMLDivElement>("statusChart");
        if (!result) {
            chartElement.innerHTML = '<div class="empty-block">上传两张表后显示状态分布。</div>';
            return;
        }

        const echarts = runtime.echarts;
        if (!echarts) throw new Error("ECharts 未加载。");

        chartElement.innerHTML = "";
        const chart = echarts.init(chartElement);
        chart.setOption({
            color: ["#2f9e44", "#f08c00", "#1971c2", "#fab005", "#4dabf7"],
            tooltip: {
                trigger: "item",
                formatter: "{b}: {c} ({d}%)"
            },
            legend: {
                orient: "vertical",
                right: 10,
                top: "middle"
            },
            series: [
                {
                    name: "状态",
                    type: "pie",
                    radius: ["45%", "72%"],
                    center: ["38%", "50%"],
                    avoidLabelOverlap: true,
                    label: {
                        formatter: "{b} {c}",
                        fontSize: 12
                    },
                    data: result.statusRows.map((row) => ({
                        name: row.status,
                        value: row.total
                    }))
                }
            ]
        });
    }

    function badgeClass(status: SessionBillStatus): string {
        if (status === "一致") return "text-bg-success";
        if (status === "场次多" || status === "仅场次有") return "text-bg-warning";
        return "text-bg-primary";
    }

    function filteredRows(): SessionBillCompareRow[] {
        const rows = state.result?.rows || [];
        if (state.filter === "all") return rows;
        if (state.filter === "diff") return rows.filter((row) => row.status !== "一致");
        return rows.filter((row) => row.status === state.filter);
    }

    function renderTable(): void {
        const rows = filteredRows();
        const body = getElement<HTMLTableSectionElement>("resultBody");
        getElement<HTMLSpanElement>("rowCount").textContent = String(rows.length);

        if (!state.result) {
            body.innerHTML = '<tr><td colspan="8" class="empty-block">上传两张表后显示核对明细。</td></tr>';
            return;
        }
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="8" class="empty-block">当前筛选没有记录。</td></tr>';
            return;
        }

        body.innerHTML = rows.map((row) => `
            <tr data-key="${escapeHtml(row.key)}" class="${row.key === state.selectedKey ? "table-active" : ""}">
                <td><span class="badge ${badgeClass(row.status)}">${escapeHtml(row.status)}</span></td>
                <td class="name-cell" title="${escapeHtml(row.matchedNames)}">${escapeHtml(row.name)}${row.matchedNames && row.matchedNames !== row.name ? `<div class="text-muted small">${escapeHtml(row.matchedNames)}</div>` : ""}</td>
                <td class="number-cell">${escapeHtml(row.sessionCount)}</td>
                <td class="number-cell">${escapeHtml(row.billCount)}</td>
                <td class="number-cell ${row.diff === 0 ? "" : row.diff > 0 ? "text-danger" : "text-primary"}">${escapeHtml(row.diff)}</td>
                <td class="refs-cell" title="${escapeHtml(row.sessionRefs)}">${escapeHtml(shortRefs(row.sessionRefs, row.sessionCount))}</td>
                <td class="refs-cell" title="${escapeHtml(row.billRefs)}">${escapeHtml(shortRefs(row.billRefs, row.billCount))}</td>
                <td>${escapeHtml(row.note)}</td>
            </tr>
        `).join("");

        body.querySelectorAll<HTMLTableRowElement>("tr[data-key]").forEach((rowElement) => {
            rowElement.addEventListener("click", () => {
                state.selectedKey = rowElement.dataset.key || "";
                renderTable();
                renderSelectedDetail();
            });
        });
    }

    function shortRefs(refs: string, count: number): string {
        if (!refs) return "-";
        const first = refs.split("；")[0] || "";
        return count > 1 ? `${first} 等 ${count} 条` : first;
    }

    function formatEntryFields(entry: SessionBillSourceEntry): string[] {
        return [
            entry.role ? `角色：${entry.role}` : "",
            entry.dateText ? `日期：${entry.dateText}` : "",
            entry.startText || entry.endText ? `时间：${entry.startText || "-"} ~ ${entry.endText || "-"}` : "",
            entry.groupText ? `组号：${entry.groupText}` : "",
            entry.natureText ? `训练性质：${entry.natureText}` : "",
            entry.modelText ? `机型：${entry.modelText}` : "",
            entry.deviceText ? `设备：${entry.deviceText}` : "",
            entry.quantityText ? `数量：${entry.quantityText}` : "",
            entry.amountText ? `金额：${entry.amountText}` : ""
        ].filter(Boolean);
    }

    function renderEntryList(entries: SessionBillSourceEntry[], emptyText: string): string {
        if (!entries.length) return `<div class="empty-block compact">${escapeHtml(emptyText)}</div>`;
        return `<ol class="source-list">${entries.map((entry) => `
            <li>
                <div class="source-entry-head">
                    <span class="source-entry-name">${escapeHtml(entry.name)}</span>
                    <span class="source-entry-ref">${escapeHtml(entry.sheetName)}!第${escapeHtml(entry.rowNumber)}行</span>
                </div>
                <div class="source-meta">
                    ${formatEntryFields(entry).map((field) => `<span class="source-chip">${escapeHtml(field)}</span>`).join("")}
                </div>
            </li>
        `).join("")}</ol>`;
    }

    function renderSelectedDetail(): void {
        const panel = getElement<HTMLDivElement>("selectedDetail");
        if (!state.result || !state.selectedKey) {
            panel.innerHTML = '<div class="empty-block compact">点击上方姓名行后，这里显示该人的场次和账单来源明细。</div>';
            return;
        }
        const row = state.result.rows.find((item) => item.key === state.selectedKey);
        const group = state.result.groupsByKey[state.selectedKey];
        if (!row || !group) {
            panel.innerHTML = '<div class="empty-block compact">未找到来源明细。</div>';
            return;
        }
        panel.innerHTML = `
            <div class="selected-title">
                <div>
                    <strong>${escapeHtml(row.name)}</strong>
                    ${row.matchedNames !== row.name ? `<span class="text-muted small">${escapeHtml(row.matchedNames)}</span>` : ""}
                </div>
                <span class="badge ${badgeClass(row.status)}">${escapeHtml(row.status)}</span>
            </div>
            <div class="row g-3">
                <div class="col-12 col-xl-6">
                    <h6 class="source-heading">场次来源 ${group.sessionEntries.length} 条</h6>
                    ${renderEntryList(group.sessionEntries, "场次表没有该姓名。")}
                </div>
                <div class="col-12 col-xl-6">
                    <h6 class="source-heading">账单来源 ${group.billEntries.length} 条</h6>
                    ${renderEntryList(group.billEntries, "账单表没有该姓名。")}
                </div>
            </div>
        `;
    }

    function renderAll(): void {
        renderFileInfo();
        renderSummary();
        renderCharts();
        renderTable();
        renderSelectedDetail();
        getElement<HTMLButtonElement>("exportButton").disabled = !state.result;
    }

    function runCompare(): void {
        if (!state.sessionAnalysis || !state.billAnalysis) {
            state.result = null;
            renderAll();
            return;
        }
        state.result = logic.compareEntries(state.sessionAnalysis.entries, state.billAnalysis.entries, {
            sessionSheetName: state.sessionAnalysis.sheetName,
            billSheetNames: state.billAnalysis.sheetNames
        });
        state.selectedKey = state.result.rows.find((row) => row.status !== "一致")?.key || state.result.rows[0]?.key || "";
        setStatus("核对完成。", "success");
        renderAll();
    }

    async function handleSessionFile(file: File): Promise<void> {
        state.sessionWorkbook = await readWorkbook(file);
        state.sessionFileName = file.name;
        state.sessionAnalysis = logic.analyzeSessionWorkbook(state.sessionWorkbook);
        runCompare();
    }

    async function handleBillFile(file: File): Promise<void> {
        state.billWorkbook = await readWorkbook(file);
        state.billFileName = file.name;
        state.billAnalysis = logic.analyzeBillWorkbook(state.billWorkbook);
        runCompare();
    }

    function bindFileInput(inputId: string, handler: (file: File) => Promise<void>): void {
        getElement<HTMLInputElement>(inputId).addEventListener("change", (event) => {
            const input = event.target as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            setStatus(`正在读取 ${file.name}...`);
            handler(file).catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                setStatus(message, "danger");
                renderAll();
            });
        });
    }

    function exportWorkbook(): void {
        if (!state.result) return;
        XLSX.writeFile(logic.buildExportWorkbook(state.result), logic.buildOutputFileName());
    }

    function bindEvents(): void {
        bindFileInput("sessionFile", handleSessionFile);
        bindFileInput("billFile", handleBillFile);
        getElement<HTMLSelectElement>("statusFilter").addEventListener("change", (event) => {
            state.filter = (event.target as HTMLSelectElement).value;
            renderTable();
        });
        getElement<HTMLButtonElement>("exportButton").addEventListener("click", exportWorkbook);
    }

    document.addEventListener("DOMContentLoaded", () => {
        bindEvents();
        renderAll();
    });
})();
