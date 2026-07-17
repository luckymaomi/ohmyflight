(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});
    const headerFill = "D9E2F3";

    function buildDocument(comparison: ManualComparison): any {
        const library = window.docx;
        if (!library?.Document || !library?.Packer) throw new Error("页面缺少 Word 导出组件。 ");
        const groups = runtime.ReportModel.buildGroups(comparison.events) as RevisionReportGroup[];
        const tableRows = [
            new library.TableRow({
                tableHeader: true,
                children: ["章节", "小节", "对比说明", "我的手册", "参考手册"].map(headerCell)
            }),
            ...groups.flatMap((group) => group.rows.map((row, rowIndex) => new library.TableRow({
                cantSplit: true,
                children: [
                    ...(rowIndex === 0 ? [groupedTextCell(group.chapter, group.rows.length)] : []),
                    ...(rowIndex === 0 ? [groupedTextCell(group.title, group.rows.length)] : []),
                    textCell(row.explanation),
                    diffCell(row.myLocation, row.myRuns),
                    diffCell(row.referenceLocation, row.referenceRuns)
                ]
            })))
        ];
        return new library.Document({
            creator: "校对之王",
            title: `${comparison.summary.myManualName} vs ${comparison.summary.referenceManualName}`,
            styles: { default: { document: { run: { font: "Microsoft YaHei", size: 20 }, paragraph: { spacing: { after: 80 } } } } },
            sections: [{
                properties: {
                    page: {
                        size: { orientation: library.PageOrientation.LANDSCAPE },
                        margin: { top: 720, right: 720, bottom: 720, left: 720 }
                    }
                },
                children: [
                    new library.Paragraph({
                        alignment: library.AlignmentType.CENTER,
                        spacing: { after: 120 },
                        children: [new library.TextRun({ text: "手册修订事件对比报告", bold: true, size: 32 })]
                    }),
                    new library.Paragraph({
                        spacing: { after: 160 },
                        children: [new library.TextRun({
                            text: `我的手册：${comparison.summary.myManualName}    参考手册：${comparison.summary.referenceManualName}`,
                            color: "595959"
                        })]
                    }),
                    new library.Table({
                        width: { size: 100, type: library.WidthType.PERCENTAGE },
                        columnWidths: [1200, 2300, 2500, 4100, 4100],
                        rows: tableRows
                    })
                ]
            }]
        });
    }

    function headerCell(value: string): any {
        const library = window.docx;
        return new library.TableCell({
            shading: { fill: headerFill },
            verticalAlign: library.VerticalAlign.CENTER,
            margins: cellMargins(),
            children: [new library.Paragraph({
                alignment: library.AlignmentType.CENTER,
                children: [new library.TextRun({ text: value, bold: true })]
            })]
        });
    }

    function textCell(value: string): any {
        const library = window.docx;
        return new library.TableCell({
            verticalAlign: library.VerticalAlign.TOP,
            margins: cellMargins(),
            children: String(value || "").split("\n").map((line) => new library.Paragraph({ children: [new library.TextRun(line)] }))
        });
    }

    function groupedTextCell(value: string, rowSpan: number): any {
        const library = window.docx;
        return new library.TableCell({
            rowSpan,
            verticalAlign: library.VerticalAlign.CENTER,
            margins: cellMargins(),
            shading: { fill: "F3F6FA" },
            children: [new library.Paragraph({
                spacing: { after: 0 },
                children: [new library.TextRun({ text: value, bold: true })]
            })]
        });
    }

    function diffCell(location: string, runs: ReportTextRun[]): any {
        const library = window.docx;
        return new library.TableCell({
            verticalAlign: library.VerticalAlign.TOP,
            margins: cellMargins(),
            children: [
                new library.Paragraph({ children: [new library.TextRun({ text: location, color: "7F7F7F", italics: true, size: 18 })] }),
                new library.Paragraph({ children: runs.length
                    ? runs.map((run) => new library.TextRun({ text: run.text, color: run.color }))
                    : [new library.TextRun({ text: "无对应原文", color: "A6A6A6", italics: true })] })
            ]
        });
    }

    function cellMargins(): { top: number; right: number; bottom: number; left: number } {
        return { top: 90, right: 100, bottom: 90, left: 100 };
    }

    async function exportDocument(comparison: ManualComparison): Promise<void> {
        const blob = await window.docx.Packer.toBlob(buildDocument(comparison));
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `校对之王修订事件_${dateStamp(new Date())}.docx`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    function dateStamp(date: Date): string {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    runtime.WordReport = { buildDocument, exportDocument };
})();
