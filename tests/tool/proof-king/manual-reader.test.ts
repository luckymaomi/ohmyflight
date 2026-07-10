import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王手册读取器", () => {
    let reader: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/proof-king/manual-reader.js"
        ]);
        reader = (context as any).ManualProof.ManualReader;
    });

    it("按稳定段落和标题拆分 Word 文本单元", () => {
        const units = reader.splitWordUnits("1.1 总则\n\n本章规定运行控制要求。\n\n第二章 记录\n保存记录。", "my-manual");

        expect(units).toHaveLength(4);
        expect(units[0]).toMatchObject({ id: "my-manual-unit-1", title: "1.1 总则" });
        expect(units[1]).toMatchObject({ title: "1.1 总则", text: "本章规定运行控制要求。" });
        expect(units[2]).toMatchObject({ title: "第二章 记录" });
    });

    it("规范 PDF 页码范围", () => {
        expect(reader.normalizePdfRange("", "", 10)).toEqual({ start: 1, end: 10 });
        expect(reader.normalizePdfRange(8, 3, 10)).toEqual({ start: 3, end: 8 });
        expect(reader.normalizePdfRange(0, 99, 10)).toEqual({ start: 1, end: 10 });
    });
});
