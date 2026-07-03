(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    type LooseIndexItem = {
        originalStart: number;
        originalEnd: number;
        normalizedText: string;
    };

    function normalizeExact(value: unknown): string {
        return value === null || value === undefined ? "" : String(value);
    }

    function normalizeLooseChar(char: string): string {
        const normalized = char.normalize("NFKC");
        const map: Record<string, string> = {
            "（": "(",
            "）": ")",
            "，": ",",
            "。": ".",
            "；": ";",
            "：": ":",
            "、": ",",
            "“": "\"",
            "”": "\"",
            "‘": "'",
            "’": "'"
        };
        return map[normalized] || normalized;
    }

    function isIgnoredLooseChar(char: string): boolean {
        return /\s/u.test(char);
    }

    function buildLooseIndex(value: unknown): { normalized: string; offsetMap: LooseIndexItem[] } {
        const source = normalizeExact(value);
        const chars = Array.from(source);
        const offsetMap: LooseIndexItem[] = [];
        let normalized = "";
        let originalOffset = 0;

        chars.forEach((char) => {
            const originalStart = originalOffset;
            const originalEnd = originalStart + char.length;
            originalOffset = originalEnd;

            if (isIgnoredLooseChar(char)) {
                return;
            }

            const normalizedText = normalizeLooseChar(char);
            Array.from(normalizedText).forEach((normalizedChar) => {
                normalized += normalizedChar;
                offsetMap.push({
                    originalStart,
                    originalEnd,
                    normalizedText: normalizedChar
                });
            });
        });

        return { normalized, offsetMap };
    }

    function normalizeLoose(value: unknown): string {
        return buildLooseIndex(value).normalized;
    }

    runtime.TextNormalizer = {
        normalizeExact,
        normalizeLoose,
        buildLooseIndex
    };
})();
