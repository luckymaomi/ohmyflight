(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});
    const rowHeight = 126;
    const overscan = 5;

    function createEntries(comparison: ManualComparison): DifferenceNavigationEntry[] {
        const mySlices = new Map(comparison.mySlices.map((slice) => [slice.id, slice]));
        const referenceSlices = new Map(comparison.referenceSlices.map((slice) => [slice.id, slice]));
        const myMissing = comparison.myMissingBlocks.map((block) => blockEntry(block, "my-missing", referenceSlices));
        const referenceMissing = comparison.referenceMissingBlocks.map((block) => blockEntry(block, "reference-missing", mySlices));
        const smallChanges = comparison.myResults
            .filter((result): result is MyManualResult & { kind: "micro" | "review" } => result.kind === "micro" || result.kind === "review")
            .map((result) => {
                const mySlice = mySlices.get(result.mySliceId);
                const referenceSliceIds = result.referenceMatch?.referenceWindowSliceIds || [];
                return {
                    id: result.id,
                    kind: result.kind,
                    title: mySlice?.title || statusLabel(result.kind),
                    location: mySlice ? sliceLocation(mySlice) : "",
                    reason: result.reason,
                    text: mySlice?.text || "",
                    mySliceIds: [result.mySliceId],
                    referenceSliceIds
                };
            });
        return [...myMissing, ...referenceMissing, ...smallChanges];
    }

    function blockEntry(
        block: StructuralDifferenceBlock,
        kind: StructuralDifferenceBlock["kind"],
        sliceMap: Map<string, ManualSlice>
    ): DifferenceNavigationEntry {
        const text = block.sliceIds
            .map((id) => sliceMap.get(id)?.text || "")
            .filter(Boolean)
            .join("\n\n");
        return {
            id: block.id,
            kind,
            title: block.title || statusLabel(kind),
            location: block.location,
            reason: kind === "my-missing"
                ? "参考手册存在连续内容，我的手册未找到可靠对应。"
                : "我的手册存在连续内容，参考手册未找到可靠对应。",
            text,
            mySliceIds: kind === "reference-missing" ? block.sliceIds : [],
            referenceSliceIds: kind === "my-missing" ? block.sliceIds : []
        };
    }

    function calculateWindow(scrollTop: number, viewportHeight: number, itemCount: number): VirtualNavigationWindow {
        const visibleCount = Math.max(1, Math.ceil(Math.max(viewportHeight, rowHeight) / rowHeight));
        const start = Math.max(0, Math.floor(Math.max(0, scrollTop) / rowHeight) - overscan);
        const end = Math.min(itemCount, start + visibleCount + overscan * 2);
        return {
            start,
            end,
            offsetTop: start * rowHeight,
            totalHeight: itemCount * rowHeight
        };
    }

    function statusLabel(kind: DifferenceNavigationEntry["kind"]): string {
        const labels: Record<DifferenceNavigationEntry["kind"], string> = {
            "my-missing": "我的手册缺失",
            "reference-missing": "参考手册缺失",
            micro: "微调",
            review: "需确认"
        };
        return labels[kind];
    }

    function sliceLocation(slice: ManualSlice): string {
        return slice.pageNumber
            ? `第 ${slice.pageNumber} 页 / 片段 ${slice.sliceIndex}`
            : `第 ${slice.unitIndex} 段 / 片段 ${slice.sliceIndex}`;
    }

    runtime.WorkspaceNavigation = {
        rowHeight,
        createEntries,
        calculateWindow,
        statusLabel
    };
})();
