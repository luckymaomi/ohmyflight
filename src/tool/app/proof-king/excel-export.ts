(function () {
    const runtime = window.ProofKing || (window.ProofKing = {});

    function requireXlsx() {
        if (!window.XLSX) {
            throw new Error("页面缺少 XLSX，无法导出 Excel。");
        }
        return window.XLSX;
    }

    function buildWorkbook(result: ProofKingCompareResult): any {
        const XLSX = requireXlsx();
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, makeSummarySheet(result), "总览");
        XLSX.utils.book_append_sheet(workbook, makeRowsSheet(result.rows, "A"), "A到B比对");
        XLSX.utils.book_append_sheet(workbook, makeRowsSheet(result.additions, "B"), "B新增内容");
        XLSX.utils.book_append_sheet(workbook, makeRowsSheet(result.conflicts, "A"), "疑似冲突");
        return workbook;
    }

    function makeSummarySheet(result: ProofKingCompareResult): any {
        const XLSX = requireXlsx();
        const summary = result.summary;
        const rows = [
            ["项目", "值"],
            ["基准手册 A", summary.sourceName],
            ["待校对手册 B", summary.targetName],
            ["A 切片数", summary.sourceSegments],
            ["B 切片数", summary.targetSegments],
            ["一致", summary.same],
            ["修改", summary.modified],
            ["删除", summary.deleted],
            ["需确认", summary.review],
            ["B 新增", summary.added],
            ["疑似冲突", summary.conflicts],
            ["A 覆盖率", formatPercent(summary.coverageRate)],
            ["平均相似度", formatPercent(summary.averageSimilarity)]
        ];
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = [{ wch: 18 }, { wch: 80 }];
        return sheet;
    }

    function makeRowsSheet(rows: ProofKingCompareRow[], sourceLabel: "A" | "B"): any {
        const XLSX = requireXlsx();
        const compareModel = runtime.CompareModel;
        const normalizer = runtime.Normalizer;
        const data = [
            [
                "序号",
                "状态",
                `${sourceLabel}位置`,
                `${sourceLabel}标题`,
                `${sourceLabel}原文`,
                "匹配率",
                "覆盖率",
                "对应位置",
                "对应原文",
                "缺失关键项",
                "新增关键项",
                "说明"
            ]
        ];
        rows.forEach((row, index) => {
            data.push([
                index + 1,
                compareModel.statusText(row.status),
                normalizer.locationOf(row.source),
                row.source.title || "",
                row.source.text,
                formatPercent(row.similarity),
                formatPercent(row.coverage),
                row.target?.windowLocation || "",
                row.target?.windowText || "",
                row.missingTokens.join("、"),
                row.extraTokens.join("、"),
                row.reason
            ]);
        });
        const sheet = XLSX.utils.aoa_to_sheet(data);
        sheet["!cols"] = [
            { wch: 8 },
            { wch: 10 },
            { wch: 18 },
            { wch: 24 },
            { wch: 60 },
            { wch: 10 },
            { wch: 10 },
            { wch: 24 },
            { wch: 60 },
            { wch: 24 },
            { wch: 24 },
            { wch: 28 }
        ];
        return sheet;
    }

    function exportWorkbook(result: ProofKingCompareResult): void {
        const XLSX = requireXlsx();
        const workbook = buildWorkbook(result);
        XLSX.writeFile(workbook, `校对之王差异报告_${formatLocalDate(new Date())}.xlsx`);
    }

    function formatPercent(value: number): string {
        return `${Math.round((Number(value) || 0) * 1000) / 10}%`;
    }

    function formatLocalDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    runtime.ExcelExport = {
        buildWorkbook,
        exportWorkbook,
        formatPercent
    };
})();
