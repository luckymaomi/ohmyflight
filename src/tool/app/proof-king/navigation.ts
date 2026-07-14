(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});
    const rowHeight = 118;
    const overscan = 4;

    function filterEvents(
        events: RevisionEvent[],
        kind: RevisionKind | "all",
        query: string,
        chapter = "all"
    ): RevisionNavigationEvent[] {
        const normalizedQuery = String(query || "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
        const results = events.flatMap((event): RevisionNavigationEvent[] => {
            const viewChapter = chapterLabel(event.title);
            if (kind !== "all" && event.kind !== kind) return [];
            if (chapter !== "all" && viewChapter !== chapter) return [];
            if (!normalizedQuery) return [{ ...event, viewChapter }];
            const titleMatched = normalized(event.title).includes(normalizedQuery);
            const myMatched = normalized(event.myText).includes(normalizedQuery);
            const referenceMatched = normalized(event.referenceText).includes(normalizedQuery);
            if (!titleMatched && !myMatched && !referenceMatched) return [];
            const matchedSide = myMatched && referenceMatched ? "both" : myMatched ? "my" : referenceMatched ? "reference" : "title";
            const source = matchedSide === "my" ? event.myText
                : matchedSide === "reference" ? event.referenceText
                    : shorterMatchingText(event, normalizedQuery);
            const sourceLength = Math.max(normalizedQuery.length, normalized(source).length);
            return [{
                ...event,
                viewChapter,
                matchedSide,
                matchedExcerpt: excerpt(source, query),
                searchScore: (titleMatched ? 300 : 0) + (myMatched ? 120 : 0) + (referenceMatched ? 120 : 0)
                    + (myMatched && referenceMatched ? 400 : 0) + Math.min(80, 2000 / sourceLength)
            }];
        });
        return normalizedQuery
            ? results.sort((left, right) => (right.searchScore || 0) - (left.searchScore || 0))
            : results;
    }

    function chapters(events: RevisionEvent[]): string[] {
        return Array.from(new Set(events.map((event) => chapterLabel(event.title)).filter(Boolean))) as string[];
    }

    function chapterLabel(title: string): string {
        const match = String(title || "").normalize("NFKC").match(/^\s*(\d+)(?:\.|\s|$)/);
        return match ? `第 ${match[1]} 章` : "";
    }

    function normalized(value: unknown): string {
        return String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
    }

    function shorterMatchingText(event: RevisionEvent, query: string): string {
        const values = [event.myText, event.referenceText].filter((value) => normalized(value).includes(query));
        return values.sort((left, right) => left.length - right.length)[0] || event.referenceText || event.myText || event.title;
    }

    function excerpt(value: string, query: string, radius = 90): string {
        const text = String(value || "").replace(/\s+/g, " ").trim();
        if (!query) return text.slice(0, radius * 2);
        const index = text.normalize("NFKC").toLowerCase().indexOf(String(query).normalize("NFKC").toLowerCase());
        if (index < 0) return text.slice(0, radius * 2);
        return text.slice(Math.max(0, index - radius), index + query.length + radius);
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

    runtime.Navigation = { rowHeight, filterEvents, chapters, chapterLabel, calculateWindow, label };
})();
