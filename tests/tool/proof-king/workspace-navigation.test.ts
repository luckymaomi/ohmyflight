import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王虚拟导航", () => {
    let navigation: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/proof-king/workspace-navigation.js"
        ]);
        navigation = (context as any).ManualProof.WorkspaceNavigation;
    });

    it("保留全部差异并把结构性缺失放在微调之前", () => {
        const comparison = makeComparison(850);
        const entries = navigation.createEntries(comparison);

        expect(entries).toHaveLength(855);
        expect(entries.slice(0, 2).every((entry: any) => entry.kind === "my-missing")).toBe(true);
        expect(entries.slice(2, 5).every((entry: any) => entry.kind === "reference-missing")).toBe(true);
        expect(entries[5].kind).toBe("review");
    });

    it("只计算可视窗口附近的固定数量卡片", () => {
        const range = navigation.calculateWindow(126 * 400, 756, 2854);

        expect(range.start).toBe(395);
        expect(range.end - range.start).toBeLessThan(25);
        expect(range.totalHeight).toBe(126 * 2854);
    });
});

function makeComparison(smallChangeCount: number) {
    const mySlices = Array.from({ length: smallChangeCount }, (_item, index) => makeSlice("my", index + 1));
    const referenceSlices = Array.from({ length: 2 }, (_item, index) => makeSlice("reference", index + 1));
    return {
        mySlices,
        referenceSlices,
        myMissingBlocks: [makeBlock("my-missing", ["reference-1"]), makeBlock("my-missing", ["reference-2"])],
        referenceMissingBlocks: [
            makeBlock("reference-missing", ["my-1"]),
            makeBlock("reference-missing", ["my-2"]),
            makeBlock("reference-missing", ["my-3"])
        ],
        myResults: mySlices.map((slice, index) => ({
            id: `result-${index + 1}`,
            kind: index % 2 ? "micro" : "review",
            mySliceId: slice.id,
            referenceMatch: { referenceWindowSliceIds: ["reference-1"] },
            reason: ""
        }))
    };
}

function makeSlice(manual: string, index: number) {
    return {
        id: `${manual}-${index}`,
        sliceIndex: index,
        unitIndex: index,
        title: "",
        text: `${manual} 文本 ${index}`
    };
}

function makeBlock(kind: string, sliceIds: string[]) {
    return { id: `${kind}-${sliceIds.join("-")}`, kind, sliceIds, location: "位置", title: "" };
}
