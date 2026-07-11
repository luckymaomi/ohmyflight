import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王顺序对齐", () => {
    let core: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/proof-king/text-engine.js",
            "tool/app/proof-king/alignment-core.js"
        ]);
        core = (context as any).ManualProofAlignment;
    });

    it("以顺序锚点为边界聚合参考新增和参考删除", () => {
        const comparison = core.compare(
            manual("my", [
                "共同开头条款要求所有人员完成训练。",
                "我的手册仍保留的完整旧规定。",
                "共同结尾条款要求记录保存备查。"
            ]),
            manual("reference", [
                "共同开头条款要求所有人员完成训练。",
                "参考手册新增的第一项完整要求。",
                "参考手册新增的第二项完整要求。",
                "共同结尾条款要求记录保存备查。"
            ])
        );

        expect(comparison.events.some((event: any) => event.kind === "reference-added" && event.referenceText.includes("第一项"))).toBe(true);
        expect(comparison.events.some((event: any) => event.kind === "reference-removed" && event.myText.includes("旧规定"))).toBe(true);
    });

    it("把同一事项的责任主体和数字变化归为内容修改", () => {
        const comparison = core.compare(
            manual("my", [
                "共同开头条款要求所有人员完成训练。",
                "飞行部负责组织检查，每季度不少于20次。",
                "共同结尾条款要求记录保存备查。"
            ]),
            manual("reference", [
                "共同开头条款要求所有人员完成训练。",
                "各单位负责组织检查，每季度不少于24次。",
                "共同结尾条款要求记录保存备查。"
            ])
        );
        const modified = comparison.events.find((event: any) => event.kind === "modified");

        expect(modified).toBeTruthy();
        expect(modified.myText).toContain("飞行部");
        expect(modified.referenceText).toContain("各单位");
        expect(modified.myTokensOnly).toContain("20");
        expect(modified.referenceTokensOnly).toContain("24");
    });

    it("同一参考片段不会被多个我的片段重复占用", () => {
        const comparison = core.compare(
            manual("my", [
                "共同开头条款要求所有人员完成训练。",
                "重复要求必须完成年度检查。",
                "重复要求必须完成年度检查。",
                "共同结尾条款要求记录保存备查。"
            ]),
            manual("reference", [
                "共同开头条款要求所有人员完成训练。",
                "重复要求必须完成年度检查。",
                "共同结尾条款要求记录保存备查。"
            ])
        );

        expect(comparison.summary.sameSliceCount).toBe(3);
        expect(comparison.events.some((event: any) => event.kind === "reference-removed")).toBe(true);
    });

    it("不会把相邻的大段新增吞进短句修改", () => {
        const comparison = core.compare(
            manual("my", [
                "共同开头条款要求完成准备。",
                "训练完成后应在六十天内接受检查。",
                "共同结尾条款要求保存记录。"
            ]),
            manual("reference", [
                "共同开头条款要求完成准备。",
                "训练完成后应在九十天内接受检查。后续新增第一项完整要求。后续新增第二项完整要求。后续新增第三项完整要求。后续新增第四项完整要求。",
                "共同结尾条款要求保存记录。"
            ])
        );

        expect(comparison.events.some((event: any) => event.kind === "modified"
            && event.myText.includes("六十天")
            && event.referenceText.includes("九十天"))).toBe(true);
        expect(comparison.events.some((event: any) => event.kind === "reference-added"
            && event.referenceText.includes("后续新增第四项"))).toBe(true);
    });
});

function manual(id: string, lines: string[]) {
    return {
        id,
        name: `${id}.docx`,
        units: lines.map((text, index) => ({
            id: `${id}-unit-${index + 1}`,
            manualId: id,
            index: index + 1,
            kind: "paragraph",
            text,
            title: ""
        }))
    };
}
