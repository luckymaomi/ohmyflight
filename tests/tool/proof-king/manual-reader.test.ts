import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王文档读取", () => {
    let reader: any;

    beforeAll(() => {
        const context = loadBrowserScripts(["tool/app/proof-king/manual-reader.js"]);
        reader = (context as any).ManualProof.ManualReader;
    });

    it("Word 全文按稳定原文单元读取并保留当前标题", () => {
        const units = reader.splitWordUnits("3.1 总则\n本章规定训练要求。\n检查程序\n保存记录。", "my");
        expect(units).toHaveLength(4);
        expect(units[1]).toMatchObject({ title: "3.1 总则", text: "本章规定训练要求。" });
        expect(units[3]).toMatchObject({ title: "检查程序" });
    });

    it("通用过滤跨页重复页眉并把 PDF 视觉行重建为段落", () => {
        const pages = [1, 2, 3, 4].map((pageNumber) => [
            line(pageNumber, "统一手册页眉", 0.05),
            line(pageNumber, "飞行人员应完成", 0.3),
            line(pageNumber, `第${pageNumber}项检查。`, 0.34),
            line(pageNumber, String(30 + pageNumber), 0.94)
        ]);
        const units = reader.extractPdfUnitsFromPages(pages, "reference");

        expect(units).toHaveLength(4);
        expect(units[0].text).toBe("飞行人员应完成第1项检查。");
        expect(units.every((unit: any) => !unit.text.includes("统一手册页眉"))).toBe(true);
    });

    it("规范 PDF 页码范围", () => {
        expect(reader.normalizePdfRange("", "", 20)).toEqual({ start: 1, end: 20 });
        expect(reader.normalizePdfRange(8, 3, 20)).toEqual({ start: 3, end: 8 });
        expect(reader.normalizePdfRange(0, 99, 20)).toEqual({ start: 1, end: 20 });
    });

    it("PDF 未结束段落在页边界切开并保留各自页码", () => {
        const units = reader.extractPdfUnitsFromPages([
            [line(8, "第一页尚未结束的内容", 0.3)],
            [line(9, "第二页继续的内容", 0.3)]
        ], "reference");

        expect(units).toMatchObject([
            { text: "第一页尚未结束的内容", pageNumber: 8 },
            { text: "第二页继续的内容", pageNumber: 9 }
        ]);
    });
});

function line(pageNumber: number, text: string, topRatio: number) {
    return { pageNumber, text, x: 10, y: 10, topRatio };
}
