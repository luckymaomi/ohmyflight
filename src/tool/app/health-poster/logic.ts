(function () {
    const posterWidth = 1080;
    const posterHeight = 1920;
    const exportFormats: HealthPosterExportFormat[] = ["png", "jpg", "webp"];
    const chineseNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

    function normalizeText(value: unknown): string {
        if (value === null || value === undefined) return "";
        return String(value).replace(/\s+/g, " ").trim();
    }

    function createDefaultPosterData(): HealthPosterData {
        return {
            title: "新手健身指南",
            subtitle: "健身必备知识解读",
            points: [
                {
                    title: "健身不是减重，而是减脂",
                    body: "健身的关键不是降低体重，而是降低体脂率。减掉脂肪，身材才会慢慢变紧实。"
                },
                {
                    title: "脂肪和肌肉无法相互转化",
                    body: "健身不是把脂肪变成肌肉，而是分解脂肪、提升肌肉量，塑造更紧实的身材曲线。"
                },
                {
                    title: "运动30分钟以上，燃脂效率会更高",
                    body: "运动到一定时长后，脂肪参与供能比例会提升，坚持规律运动更重要。"
                }
            ]
        };
    }

    function normalizePosterData(data: Partial<HealthPosterData>): HealthPosterData {
        const fallback = createDefaultPosterData();
        const rawPoints = Array.isArray(data.points) ? data.points : fallback.points;
        const points = rawPoints
            .map((point) => ({
                title: normalizeText(point?.title),
                body: normalizeText(point?.body)
            }))
            .filter((point) => point.title || point.body);

        return {
            title: normalizeText(data.title) || fallback.title,
            subtitle: normalizeText(data.subtitle) || fallback.subtitle,
            points
        };
    }

    function formatKnowledgeLabel(index: number): string {
        const safeIndex = Math.max(0, Math.floor(index));
        return `知识点${chineseNumbers[safeIndex] || String(safeIndex + 1)}`;
    }

    function createExportFilename(title: string, format: HealthPosterExportFormat): string {
        const safeFormat = exportFormats.includes(format) ? format : "png";
        const baseTitle = normalizeText(title) || "健康宣教海报";
        const safeTitle = baseTitle
            .replace(/[\\/:*?"<>|]/g, "")
            .replace(/\s+/g, "-")
            .slice(0, 40)
            || "健康宣教海报";
        return `健康宣教-${safeTitle}.${safeFormat}`;
    }

    function getMimeType(format: HealthPosterExportFormat): string {
        if (format === "jpg") return "image/jpeg";
        if (format === "webp") return "image/webp";
        return "image/png";
    }

    const runtime = window as HealthPosterRuntime;
    runtime.HealthPosterLogic = {
        posterWidth,
        posterHeight,
        exportFormats,
        createDefaultPosterData,
        normalizePosterData,
        formatKnowledgeLabel,
        createExportFilename,
        getMimeType
    };
})();
