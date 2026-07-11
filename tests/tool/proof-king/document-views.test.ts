import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王原文定位", () => {
    let views: any;

    beforeAll(() => {
        const context = loadBrowserScripts(["tool/app/proof-king/document-views.js"]);
        views = (context as any).ManualProof.DocumentViews;
    });

    it("PDF 上下文按忽略空格和标点后的原文定位", () => {
        expect(views.findNormalizedRange("前文。飞行 人员，应完成检查。后文。", "飞行人员应完成检查")).toEqual({ start: 3, end: 14 });
    });

    it("从完整手册中构造命中原文及前后上下文", () => {
        const manual = {
            units: [
                { id: "u-1", text: "第一段前文。" },
                { id: "u-2", text: "飞行 人员，应完成检查。" },
                { id: "u-3", text: "第三段后文。" }
            ]
        };

        const context = views.buildContextWindow(manual, ["u-2"], "飞行人员应完成检查", 40);

        expect(context.before).toContain("第一段前文");
        expect(context.focus).toBe("飞行 人员，应完成检查");
        expect(context.after).toContain("第三段后文");
    });

    it("计算 Word 阅读容器内部的居中滚动位置", () => {
        expect(views.calculateCenteredScrollTop(300, 100, 400, 610, 40)).toBe(630);
        expect(views.calculateCenteredScrollTop(0, 100, 400, 120, 20)).toBe(0);
    });
});
