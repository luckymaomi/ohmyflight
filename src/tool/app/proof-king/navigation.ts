(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});
    const rowHeight = 118;
    const overscan = 4;

    function filterEvents(events: RevisionEvent[], kind: RevisionKind | "all", query: string): RevisionEvent[] {
        const normalizedQuery = String(query || "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
        return events.filter((event) => {
            if (kind !== "all" && event.kind !== kind) return false;
            if (!normalizedQuery) return true;
            const haystack = `${event.title}${event.myText}${event.referenceText}`.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
            return haystack.includes(normalizedQuery);
        });
    }

    function calculateWindow(scrollTop: number, viewportHeight: number, itemCount: number): VirtualWindow {
        const visible = Math.max(1, Math.ceil(Math.max(rowHeight, viewportHeight) / rowHeight));
        const start = Math.max(0, Math.floor(Math.max(0, scrollTop) / rowHeight) - overscan);
        const end = Math.min(itemCount, start + visible + overscan * 2);
        return { start, end, offsetTop: start * rowHeight, totalHeight: itemCount * rowHeight };
    }

    function label(kind: RevisionKind): string {
        return {
            "reference-added": "参考新增",
            "reference-removed": "参考删除",
            modified: "内容修改",
            review: "待确认"
        }[kind];
    }

    runtime.Navigation = { rowHeight, filterEvents, calculateWindow, label };
})();
