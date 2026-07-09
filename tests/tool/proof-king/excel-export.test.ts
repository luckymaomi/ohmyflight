import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("proof-king excel export", () => {
    let context: any;

    beforeAll(() => {
        context = loadBrowserScripts([
            "libs/flexsearch.bundle.min.js",
            "tool/app/proof-king/normalizer.js",
            "tool/app/proof-king/segmenter.js",
            "tool/app/proof-king/search-index.js",
            "tool/app/proof-king/compare-model.js",
            "tool/app/proof-king/excel-export.js"
        ], { XLSX });
    });

    it("builds the expected review workbook sheets", () => {
        const compareModel = (context.ProofKing as any).CompareModel;
        const excelExport = (context.ProofKing as any).ExcelExport;
        const result = compareModel.compareDocuments(
            makeDocument("a", "旧版手册.docx", ["飞行人员应保持 ICAO 四级。", "机长飞行经历不少于 1000 小时。"]),
            makeDocument("b", "新版手册.pdf", ["飞行人员应保持 ICAO 四级。", "机长飞行经历不少于 1200 小时。"])
        );

        const workbook = excelExport.buildWorkbook(result);

        expect(workbook.SheetNames).toEqual(["总览", "A到B比对", "B新增内容", "疑似冲突"]);
        expect(workbook.Sheets["总览"].A1?.v).toBe("项目");
        expect(workbook.Sheets["A到B比对"].B1?.v).toBe("状态");
        expect(workbook.Sheets["疑似冲突"].E1?.v).toBe("A原文");
    });
});

function makeDocument(id: string, name: string, lines: string[]) {
    return {
        id,
        name,
        type: name.endsWith(".pdf") ? "pdf" : "docx",
        units: lines.map((text, index) => ({
            id: `${id}-u${index + 1}`,
            documentId: id,
            documentName: name,
            unitIndex: index + 1,
            title: "",
            pageNumber: name.endsWith(".pdf") ? index + 1 : undefined,
            text
        }))
    };
}
