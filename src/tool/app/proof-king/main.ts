(function () {
    const start = () => window.ManualProof.Workspace.bind();
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
})();
