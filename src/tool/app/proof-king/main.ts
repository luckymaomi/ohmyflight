(function () {
    function start(): void {
        window.ManualProof.Workspace.bind();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
        return;
    }
    start();
})();
