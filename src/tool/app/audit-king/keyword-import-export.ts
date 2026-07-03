(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    const headers = ["序号", "关键词", "标记", "启用", "颜色", "检查单段落", "检查单段落序号", "来源起点", "来源终点", "来源文本", "来源前文", "来源后文"];

    function normalizeText(value: unknown): string {
        if (value === null || value === undefined) return "";
        return String(value).trim();
    }

    function normalizeNumber(value: unknown): number | null {
        if (value === null || value === undefined || value === "") return null;
        const numberValue = typeof value === "number" ? value : Number(String(value).trim());
        return Number.isFinite(numberValue) ? numberValue : null;
    }

    function normalizeOrder(value: unknown): number | null {
        const numberValue = normalizeNumber(value);
        if (numberValue === null || numberValue < 1) return null;
        return Math.trunc(numberValue);
    }

    function normalizeEnabled(value: unknown): boolean {
        const text = normalizeText(value);
        if (!text) return true;
        return !["否", "停用", "false", "FALSE", "0", "no", "NO"].includes(text);
    }

    function buildSource(row: Record<string, unknown>): AuditKingKeywordSource | undefined {
        const blockId = normalizeText(row["检查单段落"]);
        const blockIndex = normalizeNumber(row["检查单段落序号"]);
        const start = normalizeNumber(row["来源起点"]);
        const end = normalizeNumber(row["来源终点"]);
        const text = normalizeText(row["来源文本"]);
        const beforeText = normalizeText(row["来源前文"]);
        const afterText = normalizeText(row["来源后文"]);
        const legacyBlockIndex = runtime.SourceLocator?.parseLegacyBlockIndex
            ? runtime.SourceLocator.parseLegacyBlockIndex(blockId)
            : null;
        if (!blockId && blockIndex === null && start === null && end === null && !text && !beforeText && !afterText) {
            return undefined;
        }
        const source: AuditKingKeywordSource = {};
        if (blockId) source.blockId = blockId;
        if (blockIndex !== null) {
            source.blockIndex = blockIndex;
        } else if (legacyBlockIndex !== null) {
            source.blockIndex = legacyBlockIndex;
        }
        if (start !== null) source.start = start;
        if (end !== null) source.end = end;
        if (text) source.text = text;
        if (beforeText) source.beforeText = beforeText;
        if (afterText) source.afterText = afterText;
        return source;
    }

    function buildKeywordRows(keywords: AuditKingKeyword[]): (string | number)[][] {
        return [
            headers,
            ...keywords.map((keyword, index) => [
                index + 1,
                keyword.text,
                keyword.label || "",
                keyword.enabled === false ? "否" : "是",
                keyword.color,
                keyword.source?.blockId || "",
                keyword.source?.blockIndex ?? "",
                keyword.source?.start ?? "",
                keyword.source?.end ?? "",
                keyword.source?.text || "",
                keyword.source?.beforeText || "",
                keyword.source?.afterText || ""
            ])
        ];
    }

    function buildKeywordWorkbook(keywords: AuditKingKeyword[]) {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.aoa_to_sheet(buildKeywordRows(keywords));
        sheet["!cols"] = [
            { wch: 8 },
            { wch: 24 },
            { wch: 24 },
            { wch: 8 },
            { wch: 12 },
            { wch: 24 },
            { wch: 14 },
            { wch: 10 },
            { wch: 10 },
            { wch: 24 },
            { wch: 24 },
            { wch: 24 }
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
            .map((row, rowIndex) => {
                const text = normalizeText(row["关键词"]);
                if (!text) return null;
                const order = normalizeOrder(row["序号"]);
                const label = normalizeText(row["标记"]);
                const color = normalizeText(row["颜色"]);
                const keyword: AuditKingImportedKeyword = {
                    text,
                    enabled: normalizeEnabled(row["启用"])
                };
                if (order !== null) {
                    keyword.order = order;
                }
                if (label) {
                    keyword.label = label;
                }
                if (color) {
                    keyword.color = color;
                }
                const source = buildSource(row);
                if (source) {
                    keyword.source = source;
                }
                return { keyword, rowIndex };
            })
            .filter((item): item is { keyword: AuditKingImportedKeyword; rowIndex: number } => !!item)
            .sort((left, right) => {
                const leftOrder = left.keyword.order;
                const rightOrder = right.keyword.order;
                const leftHasOrder = Number.isFinite(leftOrder);
                const rightHasOrder = Number.isFinite(rightOrder);
                if (leftHasOrder && rightHasOrder && leftOrder !== rightOrder) return (leftOrder as number) - (rightOrder as number);
                if (leftHasOrder !== rightHasOrder) return leftHasOrder ? -1 : 1;
                return left.rowIndex - right.rowIndex;
            })
            .map((item: { keyword: AuditKingImportedKeyword }) => item.keyword);
    }

    runtime.KeywordImportExport = {
        buildKeywordWorkbook,
        parseKeywordWorkbook
    };
})();
