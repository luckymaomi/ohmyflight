(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});
    const palette = [
        "#f59e0b",
        "#22c55e",
        "#3b82f6",
        "#ef4444",
        "#8b5cf6",
        "#14b8a6",
        "#f97316",
        "#64748b"
    ];

    function createKeyword(text: string, index: number, options: { color?: string; enabled?: boolean; source?: AuditKingKeywordSource } = {}): AuditKingKeyword {
        return {
            id: `kw-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
            text: text.trim(),
            color: options.color || palette[index % palette.length],
            enabled: options.enabled !== false,
            source: options.source
        };
    }

    runtime.KeywordStore = {
        createKeyword,
        palette
    };
})();
