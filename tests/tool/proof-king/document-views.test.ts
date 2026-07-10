import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王文档预览辅助逻辑", () => {
    let views: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/proof-king/document-views.js"
        ]);
        views = (context as any).ManualProof.DocumentViews;
    });

    it("在 PDF 文字层存在空白差异时仍能提取上下文", () => {
        const context = views.buildPdfTextContext(
            "前文说明。\n这里是需要\n定位的 飞行技术 要求。\n后文说明。",
            "这里是需要定位的飞行技术要求。",
            6
        );

        expect(context.matched).toBe(true);
        expect(context.before).toBe("前文说明。\n");
        expect(context.focus).toContain("这里是需要");
        expect(context.after).toBe("\n后文说明。");
    });

    it("为同一段中的后续句子建立可直接定位的锚点", () => {
        const anchors = views.wordAnchorKeys("前文说明。飞行人员应完成资格检查，并保留记录。");

        expect(anchors).toContain("飞行人员应完成资");
    });
});
