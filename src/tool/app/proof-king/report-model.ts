(function () {
    const runtime = window.ManualProof || (window.ManualProof = {});

    function buildRows(events: RevisionEvent[]): RevisionReportRow[] {
        return events.map((event) => {
            const number = sectionNumber(event.title);
            return {
                chapter: number ? `第 ${number.split(".")[0]} 章` : "未识别章节",
                number,
                title: event.title,
                explanation: `${runtime.Navigation?.label?.(event.kind) || event.kind}；${event.reason}`,
                myLocation: event.myLocation,
                referenceLocation: event.referenceLocation,
                myRuns: diffRuns(event.myDiff || [], "my"),
                referenceRuns: diffRuns(event.referenceDiff || [], "reference")
            };
        });
    }

    function sectionNumber(title: string): string {
        return String(title || "").normalize("NFKC").match(/^\s*(\d+(?:\.\d+)*)/)?.[1] || "";
    }

    function diffRuns(segments: DiffSegment[], side: ManualRole): ReportTextRun[] {
        return segments.filter((segment) => !!segment.text).map((segment) => ({
            text: segment.text,
            color: segment.kind === "equal" ? "000000"
                : segment.kind === "removed" || side === "my" ? "FF0000" : "00B0F0"
        }));
    }

    runtime.ReportModel = { buildRows, sectionNumber, diffRuns };
})();
