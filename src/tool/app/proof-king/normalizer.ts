(function () {
    const runtime = window.ProofKing || (window.ProofKing = {});

    function normalizeBasic(value: unknown): string {
        return String(value ?? "")
            .normalize("NFKC")
            .replace(/\u00a0/g, " ")
            .replace(/\u3000/g, " ")
            .toLowerCase();
    }

    function stripStructuralPrefix(value: string): string {
        return String(value || "")
            .replace(/^\s*\d+(?:\.\d+){0,6}\s*/, "")
            .replace(/^\s*[（(]\s*\d+\s*[）)]\s*/, "")
            .replace(/^\s*[一二三四五六七八九十]+[、.．]\s*/, "")
            .trim();
    }

    function normalizeForMatch(value: unknown): string {
        return stripStructuralPrefix(normalizeBasic(value))
            .replace(/[^0-9a-z\u4e00-\u9fff]+/g, "");
    }

    function extractKeyTokens(value: unknown): string[] {
        const text = normalizeBasic(value);
        const tokens = new Set<string>();
        const patterns = [
            /\b[a-z]{2,}[a-z0-9-]*\b/g,
            /\b\d+(?:\.\d+)+\b/g,
            /\d+\s*(?:小时|分钟|天|日|月|年|米|公里|海里|次|个|名|人|级)/g,
            /\b\d{2,}\b/g
        ];
        patterns.forEach((pattern) => {
            const matches = text.match(pattern) || [];
            matches.forEach((match) => {
                const token = match.replace(/\s+/g, "");
                if (token.length >= 2) {
                    tokens.add(token);
                }
            });
        });
        return Array.from(tokens).sort();
    }

    function gramsFor(value: string, size = 2): string[] {
        const text = normalizeForMatch(value);
        if (!text) return [];
        if (text.length <= size) return [text];
        const grams: string[] = [];
        for (let index = 0; index <= text.length - size; index += 1) {
            grams.push(text.slice(index, index + size));
        }
        return Array.from(new Set(grams));
    }

    function locationOf(segment: ProofKingSegment): string {
        if (segment.pageNumber) {
            return `第 ${segment.pageNumber} 页 / 片段 ${segment.segmentIndex}`;
        }
        return `第 ${segment.unitIndex} 段 / 片段 ${segment.segmentIndex}`;
    }

    runtime.Normalizer = {
        normalizeBasic,
        stripStructuralPrefix,
        normalizeForMatch,
        extractKeyTokens,
        gramsFor,
        locationOf
    };
})();
