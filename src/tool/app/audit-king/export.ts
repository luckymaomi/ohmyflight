(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function buildEvidenceRows(items: AuditKingEvidenceItem[]): string[][] {
        if (runtime.EvidenceBasket?.buildEvidenceRows) {
            return runtime.EvidenceBasket.buildEvidenceRows(items);
        }
        return [
            ["关键词", "依据名称", "检查单条款", "手册", "位置", "手册原文摘录", "备注"],
            ...items.map((item) => [
                item.keywordText,
                item.title,
                item.checklistClause,
                item.documentName,
                item.locationLabel,
                item.excerpt,
                item.note
            ])
        ];
    }

    function buildEvidenceWorkbook(items: AuditKingEvidenceItem[]) {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.aoa_to_sheet(buildEvidenceRows(items));
        sheet["!cols"] = [
            { wch: 18 },
            { wch: 24 },
            { wch: 36 },
            { wch: 28 },
            { wch: 18 },
            { wch: 48 },
            { wch: 28 }
        ];
        XLSX.utils.book_append_sheet(workbook, sheet, "依据篮子");
        return workbook;
    }

    function normalizeText(value: unknown): string {
        if (value === null || value === undefined) return "";
        return String(value).trim();
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

    function parseEvidenceWorkbook(workbook: any): AuditKingEvidenceItem[] {
        const firstSheetName = workbook.SheetNames?.[0];
        if (!firstSheetName) return [];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];
        return rowsToObjects(rows)
            .map((row) => ({
                keywordText: normalizeText(row["关键词"]),
                title: normalizeText(row["依据名称"]),
                checklistClause: normalizeText(row["检查单条款"]),
                documentName: normalizeText(row["手册"]),
                locationLabel: normalizeText(row["位置"]),
                excerpt: normalizeText(row["手册原文摘录"]),
                note: normalizeText(row["备注"])
            }))
            .filter((item) => item.title || item.checklistClause || item.excerpt || item.documentName);
    }

    runtime.Export = {
        buildEvidenceWorkbook,
        parseEvidenceWorkbook
    };
})();
