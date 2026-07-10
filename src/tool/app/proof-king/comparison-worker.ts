importScripts("../../../libs/flexsearch.bundle.min.js", "comparison-core.js");

self.addEventListener("message", (event: MessageEvent<ComparisonWorkerRequest>) => {
    const request = event.data;
    if (!request || request.type !== "compare") return;

    try {
        const core = (self as any).ManualProofCore;
        if (!core?.compare) throw new Error("校对计算核心未加载。");
        const comparison = core.compare(
            request.myManual,
            request.referenceManual,
            request.options || {},
            (progress: ComparisonProgress) => {
                const message: ComparisonWorkerProgress = {
                    type: "progress",
                    requestId: request.requestId,
                    progress
                };
                self.postMessage(message);
            }
        );
        const message: ComparisonWorkerSuccess = {
            type: "success",
            requestId: request.requestId,
            comparison
        };
        self.postMessage(message);
    } catch (error) {
        const message: ComparisonWorkerFailure = {
            type: "failure",
            requestId: request.requestId,
            message: error instanceof Error ? error.message : String(error)
        };
        self.postMessage(message);
    }
});
