import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王修订导航", () => {
    let navigation: any;

    beforeAll(() => {
        const context = loadBrowserScripts(["tool/app/proof-king/navigation.js"]);
        navigation = (context as any).ManualProof.Navigation;
    });

    it("筛选只作用于当前修订事件", () => {
        const events = [
            { kind: "reference-added", title: "新增程序", myText: "", referenceText: "检查程序" },
            { kind: "modified", title: "训练要求", myText: "20次", referenceText: "24次" }
        ];
        expect(navigation.filterEvents(events, "reference-added", "程序")).toHaveLength(1);
        expect(navigation.filterEvents(events, "modified", "24")).toHaveLength(1);
    });

    it("按标题推导章节并返回关键词命中侧和片段", () => {
        const events = [
            { id: "other", kind: "reference-removed", title: "17.2 其它训练", myText: "180掉头", referenceText: "" },
            { id: "target", kind: "modified", title: "5.7.2 模拟机训练", myText: "地面滑行要领，180掉头", referenceText: "按照指令完成滑行，180掉头" }
        ];

        expect(navigation.chapters(events)).toEqual(["第 17 章", "第 5 章"]);
        const results = navigation.filterEvents(events, "all", "180掉头", "第 5 章");
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({ id: "target", matchedSide: "both" });
        expect(results[0].matchedExcerpt).toContain("180掉头");
    });

    it("结果再多也只计算有限可视窗口", () => {
        const range = navigation.calculateWindow(50_000, 800, 10_000);
        expect(range.end - range.start).toBeLessThan(20);
        expect(range.totalHeight).toBe(10_000 * navigation.rowHeight);
    });
});
