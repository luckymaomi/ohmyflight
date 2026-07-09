(function () {
    const runtime = window.ProofKing || (window.ProofKing = {});

    let config: ProofKingSegmenterConfig = {};

    function requireNormalizer() {
        if (!runtime.Normalizer) {
            throw new Error("ProofKing.Normalizer is not loaded.");
        }
        return runtime.Normalizer;
    }

    function splitByDelimiters(value: string, delimiters: Set<string>): string[] {
        const parts: string[] = [];
        let current = "";
        Array.from(String(value || "")).forEach((char) => {
            current += char;
            if (delimiters.has(char)) {
                const text = current.trim();
                if (text) parts.push(text);
                current = "";
            }
        });
        const tail = current.trim();
        if (tail) parts.push(tail);
        return parts;
    }

    function splitLongText(value: string): string[] {
        const strong = splitByDelimiters(value, new Set(["\n", "。", "！", "？", "!", "?", "；", ";"]));
        const chunks: string[] = [];
        strong.forEach((part) => {
            const normalizedLength = requireNormalizer().normalizeForMatch(part).length;
            if (normalizedLength <= 90) {
                chunks.push(part);
                return;
            }
            const softParts = splitByDelimiters(part, new Set(["，", ",", "、", "：", ":"]));
            if (softParts.length <= 1) {
                chunks.push(...slidingRawWindows(part));
                return;
            }
            let buffer = "";
            softParts.forEach((soft) => {
                const next = `${buffer}${soft}`;
                if (requireNormalizer().normalizeForMatch(next).length > 72 && buffer) {
                    chunks.push(buffer.trim());
                    buffer = soft;
                    return;
                }
                buffer = next;
            });
            if (buffer.trim()) chunks.push(buffer.trim());
        });
        return chunks;
    }

    function slidingRawWindows(value: string): string[] {
        const chars = Array.from(String(value || "").trim());
        const windows: string[] = [];
        const size = 70;
        const step = 50;
        for (let index = 0; index < chars.length; index += step) {
            const part = chars.slice(index, index + size).join("").trim();
            if (part) windows.push(part);
            if (index + size >= chars.length) break;
        }
        return windows;
    }

    function configure(nextConfig: ProofKingSegmenterConfig): void {
        config = {
            ...config,
            ...(nextConfig || {})
        };
    }

    function resetConfig(): void {
        config = {};
    }

    function isWeakSegment(text: string, normalized: string, keyTokens: string[]): boolean {
        if (!normalized) return true;
        if (/^\d+$/.test(normalized)) return true;
        if (normalized.length < 8 && keyTokens.length === 0) return true;
        if (config.weakPhraseSet?.has(normalized)) return true;
        if (config.weakSegmentHook?.({ text, normalized, keyTokens }) === true) return true;
        return false;
    }

    function segmentDocument(documentItem: ProofKingDocument): ProofKingSegment[] {
        const normalizer = requireNormalizer();
        const segments: ProofKingSegment[] = [];
        (documentItem.units || []).forEach((unit) => {
            splitLongText(unit.text).forEach((text) => {
                const normalized = normalizer.normalizeForMatch(text);
                const keyTokens = normalizer.extractKeyTokens(text);
                if (isWeakSegment(text, normalized, keyTokens)) return;
                segments.push({
                    id: `${documentItem.id}-s${segments.length + 1}`,
                    documentId: documentItem.id,
                    documentName: documentItem.name,
                    segmentIndex: segments.length + 1,
                    unitId: unit.id,
                    unitIndex: unit.unitIndex,
                    title: unit.title || "",
                    pageNumber: unit.pageNumber,
                    text,
                    normalized,
                    keyTokens,
                    weight: Math.max(8, normalized.length)
                });
            });
        });
        return segments;
    }

    runtime.Segmenter = {
        configure,
        resetConfig,
        splitLongText,
        segmentDocument,
        isWeakSegment
    };
})();
