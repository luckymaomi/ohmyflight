import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("proof-king compare model", () => {
    let compareModel: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "libs/flexsearch.bundle.min.js",
            "tool/app/proof-king/normalizer.js",
            "tool/app/proof-king/segmenter.js",
            "tool/app/proof-king/search-index.js",
            "tool/app/proof-king/compare-model.js"
        ]);
        compareModel = (context.ProofKing as any).CompareModel;
    });

    it("compares baseline manual A against updated manual B with direction", () => {
        const source = makeDocument("a", "旧版手册.docx", [
            "飞行人员应保持 ICAO 四级。",
            "机长飞行经历不少于 1000 小时。",
            "运行控制人员应完成年度复训。"
        ]);
        const target = makeDocument("b", "新版手册.pdf", [
            "飞行人员应保持 ICAO 四级。",
            "机长飞行经历不少于 1200 小时。",
            "新增：运行控制人员应熟悉新的放行程序。"
        ]);

        const result = compareModel.compareDocuments(source, target);

        expect(result.summary.sourceSegments).toBe(3);
        expect(result.rows.map((row: any) => row.status)).toEqual(expect.arrayContaining(["same", "modified", "deleted"]));
        expect(result.conflicts.some((row: any) =>
            row.missingTokens.some((token: string) => token.includes("1000"))
            && row.extraTokens.some((token: string) => token.includes("1200"))
        )).toBe(true);
        expect(result.additions.some((row: any) => row.source.text.includes("新的放行程序"))).toBe(true);
    });

    it("treats punctuation and whitespace changes as the same content", () => {
        const result = compareModel.compareDocuments(
            makeDocument("a", "旧版手册.docx", [
                "飞行机组应当携带现行有效证件，并按规定完成检查。"
            ]),
            makeDocument("b", "新版手册.pdf", [
                "飞行机组 应当携带现行有效证件；并按规定完成检查！"
            ])
        );

        expect(result.rows[0].status).toBe("same");
        expect(result.summary.same).toBe(1);
    });

    it("keeps the matched center segment instead of letting context steal the match", () => {
        const result = compareModel.compareDocuments(
            makeDocument("a", "旧版手册.docx", [
                "机长飞行经历不少于 1000 小时。"
            ]),
            makeDocument("b", "新版手册.pdf", [
                "飞行人员应保持 ICAO 四级。",
                "机长飞行经历不少于 1200 小时。"
            ])
        );

        expect(result.rows[0].target?.segment.text).toBe("机长飞行经历不少于 1200 小时。");
        expect(result.rows[0].status).toBe("modified");
        expect(result.conflicts).toHaveLength(1);
    });

    it("does not classify unrelated short overlap as a reliable match", () => {
        const result = compareModel.compareDocuments(
            makeDocument("a", "旧版手册.docx", [
                "运行控制人员应完成年度复训并保存记录。"
            ]),
            makeDocument("b", "新版手册.pdf", [
                "飞行人员应完成体检并保存证件。"
            ])
        );

        expect(["deleted", "review"]).toContain(result.rows[0].status);
        expect(result.rows[0].status).not.toBe("same");
    });

    it("reports added target content through reverse comparison", () => {
        const result = compareModel.compareDocuments(
            makeDocument("a", "旧版手册.docx", [
                "飞行机组应完成资格检查。"
            ]),
            makeDocument("b", "新版手册.pdf", [
                "飞行机组应完成资格检查。",
                "新增运行控制席位交接记录保存要求。"
            ])
        );

        expect(result.additions.some((row: any) => row.source.text.includes("席位交接"))).toBe(true);
        expect(result.summary.added).toBeGreaterThanOrEqual(1);
    });

    it("filters repeated short page furniture without hard-coded phrases", () => {
        const repeated = Array.from({ length: 6 }, (_item, index) => ({
            id: `s${index + 1}`,
            normalized: "revision26",
            text: "Revision 26",
            weight: 10
        }));
        const unique = { id: "unique", normalized: "uniquesubstantiverequirement", text: "unique substantive requirement", weight: 28 };

        const filtered = compareModel.filterRepeatedShortSegments([...repeated, unique]);

        expect(filtered).toEqual([unique]);
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
