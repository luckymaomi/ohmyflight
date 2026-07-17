(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});

    function buildWorkbook(comparison: ManualComparison): any {
        if (!window.XLSX) throw new Error("页面缺少 Excel 导出组件。 ");
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, summarySheet(comparison), "总览");
        window.XLSX.utils.book_append_sheet(workbook, eventsSheet(comparison.events), "修订事件");
        window.XLSX.utils.book_append_sheet(workbook, eventsSheet(comparison.events.filter((event) => event.kind === "reference-added")), "参考新增");
        window.XLSX.utils.book_append_sheet(workbook, eventsSheet(comparison.events.filter((event) => event.kind === "reference-removed")), "参考删除");
        window.XLSX.utils.book_append_sheet(workbook, eventsSheet(comparison.events.filter((event) => event.kind === "modified")), "内容修改");
        window.XLSX.utils.book_append_sheet(workbook, eventsSheet(comparison.events.filter((event) => event.kind === "review")), "待确认");
        return workbook;
    }

    function summarySheet(comparison: ManualComparison): any {
        const summary = comparison.summary;
        const sheet = window.XLSX.utils.aoa_to_sheet([
            ["项目", "值"],
            ["我的手册", summary.myManualName],
            ["参考手册", summary.referenceManualName],
            ["我的手册句级单元", summary.mySliceCount],
            ["参考手册句级单元", summary.referenceSliceCount],
            ["唯一原文锚点", summary.exactAnchorCount],
            ["顺序一致单元", summary.sameSliceCount],
            ["参考新增事件", summary.referenceAddedCount],
            ["参考删除事件", summary.referenceRemovedCount],
            ["内容修改事件", summary.modifiedCount],
            ["待确认事件", summary.reviewCount]
        ]);
        sheet["!cols"] = [{ wch: 24 }, { wch: 80 }];
        return sheet;
    }

    function eventsSheet(events: RevisionEvent[]): any {
        const rows: Array<Array<string | number>> = [[
            "序号", "类别", "章节", "小节编号", "小节标题", "组内序号",
            "我的手册位置", "我的手册完整原文", "参考手册位置", "参考手册完整原文",
            "对应度", "我的手册独有数字/英文", "参考手册独有数字/英文", "判断依据"
        ]];
        let eventIndex = 0;
        const groups = runtime.ReportModel.buildGroups(events) as RevisionReportGroup[];
        groups.forEach((group) => group.rows.forEach((_row, groupIndex) => {
            const event = events[eventIndex];
            eventIndex += 1;
            rows.push([
                eventIndex,
                runtime.Navigation.label(event.kind),
                group.chapter,
                group.number,
                group.title,
                groupIndex + 1,
                event.myLocation,
                event.myText,
                event.referenceLocation,
                event.referenceText,
                formatPercent(event.similarity),
                event.myTokensOnly.join("、"),
                event.referenceTokensOnly.join("、"),
                event.reason
            ]);
        }));
        const sheet = window.XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = [
            { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 34 }, { wch: 10 },
            { wch: 24 }, { wch: 80 }, { wch: 24 }, { wch: 80 }, { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 44 }
        ];
        return sheet;
    }

    function exportWorkbook(comparison: ManualComparison): void {
        window.XLSX.writeFile(buildWorkbook(comparison), `校对之王修订事件_${dateStamp(new Date())}.xlsx`);
    }

    function formatPercent(value: number): string {
        return `${Math.round((Number(value) || 0) * 1000) / 10}%`;
    }

    function dateStamp(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    runtime.ExcelReport = { buildWorkbook, exportWorkbook, formatPercent };
})();
