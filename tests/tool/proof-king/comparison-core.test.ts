import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王比对核心", () => {
    let core: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/proof-king/comparison-core.js"
        ]);
        core = (context as any).ManualProofCore;
    });

    it("将可靠一致句子视为覆盖，并把双向未匹配内容聚合为结构性缺失", () => {
        const comparison = core.compare(
            makeManual("我的手册.docx", [
                "共同条款：飞行人员应完成资格检查。",
                "我的手册独有甲：运行控制人员执行本地交接流程。",
                "我的手册独有乙：本地交接记录应保存备查。"
            ]),
            makeManual("参考手册.pdf", [
                "共同条款：飞行人员应完成资格检查。",
                "参考手册独有甲：机组执行新版放行程序。",
                "参考手册独有乙：新版放行记录应保存备查。"
            ])
        );

        expect(comparison.myResults[0]).toMatchObject({ kind: "same", similarity: 1, coverage: 1 });
        expect(comparison.referenceMissingBlocks).toHaveLength(1);
        expect(comparison.myMissingBlocks).toHaveLength(1);
        expect(textFor(comparison.referenceMissingBlocks[0].sliceIds, comparison.mySlices)).toContain("我的手册独有甲");
        expect(textFor(comparison.myMissingBlocks[0].sliceIds, comparison.referenceSlices)).toContain("参考手册独有甲");
    });

    it("不内置业务词特判，并保留数字和英文差异为微调", () => {
        const comparison = core.compare(
            makeManual("我的手册.docx", ["机长飞行经历不少于 1000 小时，ICAO 四级。"]),
            makeManual("参考手册.pdf", ["机长飞行经历不少于 1200 小时，ICAO 四级。"])
        );

        expect(comparison.myResults[0]).toMatchObject({ kind: "micro" });
        expect(comparison.myResults[0].missingTokens).toContain("1000小时");
        expect(comparison.myResults[0].extraTokens).toContain("1200小时");
    });
});

function makeManual(name: string, lines: string[]) {
    const id = name.endsWith(".pdf") ? "reference-manual" : "my-manual";
    return {
        id,
        name,
        units: lines.map((text, index) => ({
            id: `${id}-unit-${index + 1}`,
            manualId: id,
            unitIndex: index + 1,
            title: "",
            pageNumber: name.endsWith(".pdf") ? index + 1 : undefined,
            text
        }))
    };
}

function textFor(ids: string[], slices: any[]) {
    const byId = new Map(slices.map((slice) => [slice.id, slice.text]));
    return ids.map((id) => byId.get(id) || "").join("\n");
}
