(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function buildEvidenceRows(groups: AuditKingEvidenceGroup[]): Array<Array<string | number>> {
        if (runtime.EvidenceBasket?.buildEvidenceRows) {
            return runtime.EvidenceBasket.buildEvidenceRows(groups);
        }
        return [
            ["条款名称", "依据序号", "依据内容", "备注"],
            ...groups.flatMap((group) => {
                if (!group.items.length) {
                    return [[group.title, 0, "", ""]];
                }
                return group.items.map((item, index) => [
                    group.title,
                    index + 1,
                    item.content,
                    item.note
                ]);
            })
        ];
    }

    function buildEvidenceWorkbook(groups: AuditKingEvidenceGroup[]) {
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.aoa_to_sheet(buildEvidenceRows(groups));
        sheet["!cols"] = [
            { wch: 24 },
            { wch: 10 },
            { wch: 64 },
            { wch: 28 }
        ];
        XLSX.utils.book_append_sheet(workbook, sheet, "审计篮子");
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

    function makeGroupId(index: number): string {
        return `evidence-group-${index + 1}`;
    }

    function parseEvidenceWorkbook(workbook: any): AuditKingEvidenceGroup[] {
        const firstSheetName = workbook.SheetNames?.[0];
        if (!firstSheetName) return [];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];
        const groups: AuditKingEvidenceGroup[] = [];
        const groupIndexes = new Map<string, number>();
        rowsToObjects(rows)
            .map((row) => ({
                title: normalizeText(row["条款名称"]),
                content: normalizeText(row["依据内容"]),
                note: normalizeText(row["备注"])
            }))
            .filter((item) => item.title || item.content || item.note)
            .forEach((item) => {
                const key = item.title;
                let groupIndex = groupIndexes.get(key);
                if (groupIndex === undefined) {
                    groupIndex = groups.length;
                    groupIndexes.set(key, groupIndex);
                    groups.push({
                        id: makeGroupId(groupIndex),
                        title: item.title,
                        items: []
                    });
                }
                if (item.content || item.note) {
                    groups[groupIndex].items.push({
                        content: item.content,
                        note: item.note
                    });
                }
            });
        return groups;
    }

    runtime.Export = {
        buildEvidenceWorkbook,
        parseEvidenceWorkbook
    };
})();
