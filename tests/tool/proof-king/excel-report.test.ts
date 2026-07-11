import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王 Excel 报告", () => {
    let report: any;

    beforeAll(() => {
        const XLSX = {
            utils: {
                book_new: () => ({ SheetNames: [] as string[], Sheets: {} as Record<string, unknown> }),
                aoa_to_sheet: (rows: unknown[][]) => ({ rows }),
                book_append_sheet: (book: any, sheet: any, name: string) => {
                    book.SheetNames.push(name);
                    book.Sheets[name] = sheet;
                }
            }
        };
        const context = loadBrowserScripts([
            "tool/app/proof-king/navigation.js",
            "tool/app/proof-king/excel-report.js"
        ], { XLSX });
        report = (context as any).ManualProof.ExcelReport;
    });

    it("按修订事件导出完整双侧原文", () => {
        const workbook = report.buildWorkbook({
            summary: {
                myManualName: "我的手册.docx", referenceManualName: "参考手册.pdf", mySliceCount: 1,
                referenceSliceCount: 1, exactAnchorCount: 0, sameSliceCount: 0, referenceAddedCount: 1,
                referenceRemovedCount: 0, modifiedCount: 0, reviewCount: 0
            },
            events: [{
                id: "revision-1", kind: "reference-added", title: "新增程序", myLocation: "无对应原文",
                myText: "", referenceLocation: "第 3 页", referenceText: "完整新增原文。", similarity: 0,
                myTokensOnly: [], referenceTokensOnly: [], reason: "参考新增"
            }]
        });
        expect(workbook.SheetNames).toEqual(["总览", "修订事件", "参考新增", "参考删除", "内容修改", "待确认"]);
        expect(workbook.Sheets["参考新增"].rows[1]).toContain("完整新增原文。");
    });
});
