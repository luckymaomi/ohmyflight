(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    const headers = ["关键词", "启用", "颜色", "检查单段落", "来源起点", "来源终点"];

    function normalizeText(value: unknown): string {
        if (value === null || value === undefined) return "";
        return String(value).trim();
    }

    function normalizeNumber(value: unknown): number | null {
        if (value === null || value === undefined || value === "") return null;
        const numberValue = typeof value === "number" ? value : Number(String(value).trim());
        return Number.isFinite(numberValue) ? numberValue : null;
    }

    function normalizeEnabled(value: unknown): boolean {
        const text = normalizeText(value);
        if (!text) return true;
        return !["否", "停用", "false", "FALSE", "0", "no", "NO"].includes(text);
    }

    function buildSource(row: Record<string, unknown>): AuditKingKeywordSource | undefined {
        const blockId = normalizeText(row["检查单段落"]);
        const start = normalizeNumber(row["来源起点"]);
        const end = normalizeNumber(row["来源终点"]);
        if (!blockId || start === null || end === null) {
            return undefined;
        }
        return { blockId, start, end };
    }

    function buildKeywordRows(keywords: AuditKingKeyword[]): (string | number)[][] {
        return [
            headers,
            ...keywords.map((keyword) => [
                keyword.text,
                keyword.enabled === false ? "否" : "是",
                keyword.color,
                keyword.source?.blockId || "",
                keyword.source?.start ?? "",
                keyword.source?.end ?? ""
            ])
        ];
    }

    function buildKeywordWorkbook(keywords: AuditKingKeyword[]) {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.aoa_to_sheet(buildKeywordRows(keywords));
        sheet["!cols"] = [
            { wch: 24 },
            { wch: 8 },
            { wch: 12 },
            { wch: 24 },
            { wch: 10 },
            { wch: 10 }
        ];
        XLSX.utils.book_append_sheet(workbook, sheet, "关键词");
        return workbook;
    }

    function rowsToObjects(rows: unknown[][]): Record<string, unknown>[] {
        const headerRow = rows[0] || [];
        const headerNames = headerRow.map(normalizeText);
        return rows.slice(1).map((row) => {
            const item: Record<string, unknown> = {};
            headerNames.forEach((header, index) => {
                if (header) {
                    item[header] = row[index];
                }
            });
            return item;
        });
    }

    function parseKeywordWorkbook(workbook: any): AuditKingImportedKeyword[] {
        const firstSheetName = workbook.SheetNames?.[0];
        if (!firstSheetName) return [];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];

        return rowsToObjects(rows)
            .map((row) => {
                const text = normalizeText(row["关键词"]);
                if (!text) return null;
                const color = normalizeText(row["颜色"]);
                const keyword: AuditKingImportedKeyword = {
                    text,
                    enabled: normalizeEnabled(row["启用"])
                };
                if (color) {
                    keyword.color = color;
                }
                const source = buildSource(row);
                if (source) {
                    keyword.source = source;
                }
                return keyword;
            })
            .filter(Boolean) as AuditKingImportedKeyword[];
    }

    runtime.KeywordImportExport = {
        buildKeywordWorkbook,
        parseKeywordWorkbook
    };
})();
