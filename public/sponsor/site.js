document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
        const value = button.getAttribute("data-copy") || "";
        if (!value) return;
        try {
            await copyText(value);
            button.textContent = "已复制";
            window.setTimeout(() => {
                button.textContent = "复制";
            }, 1400);
        } catch {
            button.textContent = "复制失败";
        }
    });
});

async function copyText(value) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("copy failed");
}
