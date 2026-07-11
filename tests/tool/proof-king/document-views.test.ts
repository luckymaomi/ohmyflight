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
});
