import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王 Excel 报告", () => {
    let report: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/proof-king/excel-report.js"
        ], { XLSX });
        report = (context as any).ManualProof.ExcelReport;
    });

    it("输出当前语义的五个工作表和完整原文列", () => {
        const workbook = report.buildWorkbook(makeComparison());

        expect(workbook.SheetNames).toEqual(["总览", "我的手册比对", "我的手册缺失", "参考手册缺失", "疑似冲突"]);
        expect(workbook.Sheets["总览"].A2?.v).toBe("我的手册");
        expect(workbook.Sheets["我的手册比对"].E1?.v).toBe("我的手册完整原文");
        expect(workbook.Sheets["我的手册缺失"].E1?.v).toBe("完整原文");
    });
});

function makeComparison() {
    const mySlice = makeSlice("my-1", "我的内容。", 1);
    const referenceSlice = makeSlice("reference-1", "参考内容。", 1);
    return {
        mySlices: [mySlice],
        referenceSlices: [referenceSlice],
        myResults: [{
            id: "result-1",
            kind: "micro",
            mySliceId: mySlice.id,
            referenceMatch: {
                referenceWindowSliceIds: [referenceSlice.id]
            },
            similarity: 0.8,
            coverage: 0.8,
            missingTokens: [],
            extraTokens: [],
            reason: "文字变化。"
        }],
        referenceMissingResults: [],
        myMissingBlocks: [{ id: "my-block", kind: "my-missing", sliceIds: [referenceSlice.id], location: "第 1 页", title: "" }],
        referenceMissingBlocks: [{ id: "reference-block", kind: "reference-missing", sliceIds: [mySlice.id], location: "第 1 段", title: "" }],
        conflictResultIds: ["result-1"],
        summary: {
            myManualName: "我的手册.docx",
            referenceManualName: "参考手册.pdf",
            mySliceCount: 1,
            referenceSliceCount: 1,
            sameCount: 0,
            microCount: 1,
            reviewCount: 0,
            myMissingBlockCount: 1,
            referenceMissingBlockCount: 1,
            conflictCount: 1,
            myCoverageRate: 0.8,
            averageSimilarity: 0.8
        }
    };
}

function makeSlice(id: string, text: string, index: number) {
    return {
        id,
        sliceIndex: index,
        unitIndex: index,
        title: "",
        pageNumber: undefined,
        text
    };
}
