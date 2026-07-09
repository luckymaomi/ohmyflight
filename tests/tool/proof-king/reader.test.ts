import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("proof-king reader helpers", () => {
    let reader: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/proof-king/reader.js"
        ]);
        reader = (context.ProofKing as any).Reader;
    });

    it("normalizes pdf page ranges and clamps them to document bounds", () => {
        expect(reader.normalizePageRange("", "", 10)).toEqual({ start: 1, end: 10 });
        expect(reader.normalizePageRange(8, 3, 10)).toEqual({ start: 3, end: 8 });
        expect(reader.normalizePageRange(0, 99, 10)).toEqual({ start: 1, end: 10 });
    });

    it("splits docx text into stable text units with titles", () => {
        const units = reader.splitDocxUnits("1.1 总则\n\n本章规定运行控制要求。\n\n第二章 记录\n保存记录。", "doc-a", "手册.docx");

        expect(units).toHaveLength(4);
        expect(units[0]).toMatchObject({ id: "doc-a-u1", unitIndex: 1, title: "1.1 总则" });
        expect(units[1]).toMatchObject({ title: "1.1 总则", text: "本章规定运行控制要求。" });
        expect(units[2]).toMatchObject({ title: "第二章 记录" });
    });
});
