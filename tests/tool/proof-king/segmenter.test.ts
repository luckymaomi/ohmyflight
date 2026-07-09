import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("proof-king segmenter", () => {
    let segmenter: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/proof-king/normalizer.js",
            "tool/app/proof-king/segmenter.js"
        ]);
        segmenter = (context.ProofKing as any).Segmenter;
    });

    it("splits text by punctuation first and keeps business tokens", () => {
        const documentItem = {
            id: "manual-a",
            name: "基准手册.docx",
            type: "docx",
            units: [{
                id: "u1",
                documentId: "manual-a",
                documentName: "基准手册.docx",
                unitIndex: 1,
                title: "",
                text: "飞行人员应保持 ICAO 四级。经历不少于 1000 小时；符合 CCAR 121.467。"
            }]
        };

        const segments = segmenter.segmentDocument(documentItem);

        expect(segments.map((item: any) => item.text)).toEqual([
            "飞行人员应保持 ICAO 四级。",
            "经历不少于 1000 小时；",
            "符合 CCAR 121.467。"
        ]);
        expect(segments.flatMap((item: any) => item.keyTokens)).toEqual(
            expect.arrayContaining(["icao", "1000小时", "ccar", "121.467"])
        );
    });

    it("does not hard-code business weak phrases and supports injected filters", () => {
        const documentItem = {
            id: "manual-a",
            name: "基准手册.docx",
            type: "docx",
            units: [{
                id: "u1",
                documentId: "manual-a",
                documentName: "基准手册.docx",
                unitIndex: 1,
                title: "",
                text: "这是需要人工排除的通用提示内容。正式运行控制要求应当保留。"
            }]
        };

        segmenter.resetConfig();
        expect(segmenter.segmentDocument(documentItem).map((item: any) => item.text)).toContain("这是需要人工排除的通用提示内容。");

        segmenter.configure({
            weakSegmentHook(input: { text: string }) {
                return input.text.includes("人工排除");
            }
        });

        expect(segmenter.segmentDocument(documentItem).map((item: any) => item.text)).not.toContain("这是需要人工排除的通用提示内容。");
        segmenter.resetConfig();
    });
});
