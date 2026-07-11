importScripts("text-engine.js", "alignment-events.js", "alignment-core.js");

self.addEventListener("message", (event: MessageEvent<ComparisonWorkerRequest>) => {
    const request = event.data;
    if (!request || request.type !== "compare") return;
    try {
        const comparison = (self as any).ManualProofAlignment.compare(
            request.myManual,
            request.referenceManual,
            request.options || {},
            (progress: ComparisonProgress) => {
                self.postMessage({ type: "progress", requestId: request.requestId, progress } as ComparisonWorkerProgress);
            }
        );
        self.postMessage({ type: "success", requestId: request.requestId, comparison } as ComparisonWorkerSuccess);
    } catch (error) {
        self.postMessage({
            type: "failure",
            requestId: request.requestId,
            message: error instanceof Error ? error.message : String(error)
        } as ComparisonWorkerFailure);
    }
});
