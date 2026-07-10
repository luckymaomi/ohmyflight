(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});

    function buildWorkbook(comparison: ManualComparison): any {
        if (!window.XLSX) throw new Error("页面缺少 Excel 导出组件。");
        const XLSX = window.XLSX;
        const workbook = XLSX.utils.book_new();
        const mySlices = new Map(comparison.mySlices.map((slice) => [slice.id, slice]));
        const referenceSlices = new Map(comparison.referenceSlices.map((slice) => [slice.id, slice]));

        XLSX.utils.book_append_sheet(workbook, makeSummarySheet(comparison), "总览");
        XLSX.utils.book_append_sheet(workbook, makeMyComparisonSheet(comparison, mySlices, referenceSlices), "我的手册比对");
        XLSX.utils.book_append_sheet(
            workbook,
            makeBlocksSheet(comparison.myMissingBlocks, referenceSlices, "我的手册缺失", "参考手册存在、我的手册未找到可靠对应。"),
            "我的手册缺失"
        );
        XLSX.utils.book_append_sheet(
            workbook,
            makeBlocksSheet(comparison.referenceMissingBlocks, mySlices, "参考手册缺失", "我的手册存在、参考手册未找到可靠对应。"),
            "参考手册缺失"
        );
        XLSX.utils.book_append_sheet(workbook, makeConflictSheet(comparison, mySlices, referenceSlices), "疑似冲突");
        return workbook;
    }

    function makeSummarySheet(comparison: ManualComparison): any {
        const XLSX = window.XLSX;
        const summary = comparison.summary;
        const sheet = XLSX.utils.aoa_to_sheet([
            ["项目", "值"],
            ["我的手册", summary.myManualName],
            ["参考手册", summary.referenceManualName],
            ["我的手册切片数", summary.mySliceCount],
            ["参考手册切片数", summary.referenceSliceCount],
            ["一致", summary.sameCount],
            ["微调", summary.microCount],
            ["需确认", summary.reviewCount],
            ["我的手册缺失块", summary.myMissingBlockCount],
            ["参考手册缺失块", summary.referenceMissingBlockCount],
            ["疑似冲突", summary.conflictCount],
            ["我的手册覆盖率", formatPercent(summary.myCoverageRate)],
            ["平均相似度", formatPercent(summary.averageSimilarity)]
        ]);
        sheet["!cols"] = [{ wch: 20 }, { wch: 82 }];
        return sheet;
    }

    function makeMyComparisonSheet(
        comparison: ManualComparison,
        mySlices: Map<string, ManualSlice>,
        referenceSlices: Map<string, ManualSlice>
    ): any {
        const XLSX = window.XLSX;
        const data: Array<Array<string | number>> = [[
            "序号",
            "状态",
            "我的手册位置",
            "我的手册标题",
            "我的手册完整原文",
            "匹配率",
            "覆盖率",
            "参考手册位置",
            "参考手册完整原文",
            "缺失关键项",
            "新增关键项",
            "说明"
        ]];
        comparison.myResults.forEach((result, index) => {
            const mySlice = mySlices.get(result.mySliceId);
            const match = result.referenceMatch;
            const referenceWindow = (match?.referenceWindowSliceIds || [])
                .map((id) => referenceSlices.get(id))
                .filter((slice): slice is ManualSlice => !!slice);
            data.push([
                index + 1,
                labelForResult(result.kind),
                mySlice ? sliceLocation(mySlice) : "",
                mySlice?.title || "",
                mySlice?.text || "",
                formatPercent(result.similarity),
                formatPercent(result.coverage),
                referenceWindow.map(sliceLocation).join(" ~ "),
                referenceWindow.map((slice) => slice.text).join("\n"),
                result.missingTokens.join("、"),
                result.extraTokens.join("、"),
                result.reason
            ]);
        });
        return makeWideSheet(data);
    }

    function makeBlocksSheet(
        blocks: StructuralDifferenceBlock[],
        slices: Map<string, ManualSlice>,
        label: string,
        reason: string
    ): any {
        const XLSX = window.XLSX;
        const data: Array<Array<string | number>> = [["序号", "状态", "位置", "标题", "完整原文", "片段数", "说明"]];
        blocks.forEach((block, index) => {
            data.push([
                index + 1,
                label,
                block.location,
                block.title,
                block.sliceIds.map((id) => slices.get(id)?.text || "").filter(Boolean).join("\n\n"),
                block.sliceIds.length,
                reason
            ]);
        });
        const sheet = XLSX.utils.aoa_to_sheet(data);
        sheet["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 28 }, { wch: 28 }, { wch: 80 }, { wch: 10 }, { wch: 44 }];
        return sheet;
    }

    function makeConflictSheet(
        comparison: ManualComparison,
        mySlices: Map<string, ManualSlice>,
        referenceSlices: Map<string, ManualSlice>
    ): any {
        const resultIds = new Set(comparison.conflictResultIds);
        const conflictComparison: ManualComparison = {
            ...comparison,
            myResults: comparison.myResults.filter((result) => resultIds.has(result.id))
        };
        return makeMyComparisonSheet(conflictComparison, mySlices, referenceSlices);
    }

    function makeWideSheet(data: Array<Array<string | number>>): any {
        const XLSX = window.XLSX;
        const sheet = XLSX.utils.aoa_to_sheet(data);
        sheet["!cols"] = [
            { wch: 8 },
            { wch: 18 },
            { wch: 24 },
            { wch: 26 },
            { wch: 68 },
            { wch: 10 },
            { wch: 10 },
            { wch: 24 },
            { wch: 68 },
            { wch: 24 },
            { wch: 24 },
            { wch: 32 }
        ];
        return sheet;
    }

    function exportWorkbook(comparison: ManualComparison): void {
        const XLSX = window.XLSX;
        XLSX.writeFile(buildWorkbook(comparison), `校对之王差异报告_${dateStamp(new Date())}.xlsx`);
    }

    function labelForResult(kind: MyManualResult["kind"]): string {
        const labels: Record<MyManualResult["kind"], string> = {
            same: "一致",
            micro: "微调",
            review: "需确认",
            "reference-missing": "参考手册缺失"
        };
        return labels[kind];
    }

    function sliceLocation(slice: ManualSlice): string {
        return slice.pageNumber
            ? `第 ${slice.pageNumber} 页 / 片段 ${slice.sliceIndex}`
            : `第 ${slice.unitIndex} 段 / 片段 ${slice.sliceIndex}`;
    }

    function formatPercent(value: number): string {
        return `${Math.round((Number(value) || 0) * 1000) / 10}%`;
    }

    function dateStamp(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    runtime.ExcelReport = {
        buildWorkbook,
        exportWorkbook,
        formatPercent
    };
})();
