(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});
    const CONTEXT_LENGTH = 20;

    function makeSource(block: AuditKingTextBlock, start: number, end: number): AuditKingKeywordSource {
        const safeStart = Math.max(0, Math.min(start, block.text.length));
        const safeEnd = Math.max(safeStart, Math.min(end, block.text.length));
        return {
            blockId: block.id,
            blockIndex: block.blockIndex,
            start: safeStart,
            end: safeEnd,
            text: block.text.slice(safeStart, safeEnd),
            beforeText: block.text.slice(Math.max(0, safeStart - CONTEXT_LENGTH), safeStart),
            afterText: block.text.slice(safeEnd, Math.min(block.text.length, safeEnd + CONTEXT_LENGTH))
        };
    }

    function normalizeNumber(value: unknown): number | null {
        if (value === null || value === undefined || value === "") return null;
        const numberValue = typeof value === "number" ? value : Number(String(value).trim());
        return Number.isFinite(numberValue) ? numberValue : null;
    }

    function parseLegacyBlockIndex(blockId: unknown): number | null {
        const match = String(blockId || "").match(/-b(\d+)$/);
        return match ? Number(match[1]) : null;
    }

    function getSourceBlockIndex(source: AuditKingKeywordSource): number | null {
        return normalizeNumber(source.blockIndex) ?? parseLegacyBlockIndex(source.blockId);
    }

    function textAt(block: AuditKingTextBlock, start: number | null, end: number | null): string {
        if (start === null || end === null || start < 0 || end <= start || end > block.text.length) return "";
        return block.text.slice(start, end);
    }

    function matchesExpected(selected: string, expected: string): boolean {
        return !!selected && !!expected && selected === expected;
    }

    function resolveByCoordinates(
        block: AuditKingTextBlock | undefined,
        source: AuditKingKeywordSource,
        keywordText: string
    ): AuditKingKeywordSource | null {
        if (!block) return null;
        const start = normalizeNumber(source.start);
        const end = normalizeNumber(source.end);
        const selected = textAt(block, start, end);
        const expected = source.text || keywordText;
        if (!matchesExpected(selected, expected)) return null;
        return makeSource(block, start as number, end as number);
    }

    function findAllInBlock(block: AuditKingTextBlock, text: string): AuditKingKeywordSource[] {
        if (!text) return [];
        const matches: AuditKingKeywordSource[] = [];
        let start = block.text.indexOf(text);
        while (start >= 0) {
            matches.push(makeSource(block, start, start + text.length));
            start = block.text.indexOf(text, start + Math.max(1, text.length));
        }
        return matches;
    }

    function contextMatches(blockText: string, candidate: AuditKingKeywordSource, source: AuditKingKeywordSource): boolean {
        const start = normalizeNumber(candidate.start);
        const end = normalizeNumber(candidate.end);
        if (start === null || end === null) return false;
        const before = source.beforeText || "";
        const after = source.afterText || "";
        const beforeOk = !before || blockText.slice(Math.max(0, start - before.length), start) === before;
        const afterOk = !after || blockText.slice(end, Math.min(blockText.length, end + after.length)) === after;
        return beforeOk && afterOk;
    }

    function uniqueByContext(blocks: AuditKingTextBlock[], source: AuditKingKeywordSource, keywordText: string): AuditKingKeywordSource | null {
        const sourceText = source.text || keywordText;
        if (!sourceText) return null;
        const matches = blocks
            .flatMap((block) => findAllInBlock(block, sourceText).filter((candidate) => contextMatches(block.text, candidate, source)));
        return matches.length === 1 ? matches[0] : null;
    }

    function uniqueInBlock(block: AuditKingTextBlock | undefined, keywordText: string): AuditKingKeywordSource | null {
        if (!block) return null;
        const matches = findAllInBlock(block, keywordText);
        return matches.length === 1 ? matches[0] : null;
    }

    function resolveSource(
        source: AuditKingKeywordSource | undefined,
        blocks: AuditKingTextBlock[],
        keywordText: string
    ): AuditKingKeywordSource | undefined {
        if (!source || !blocks.length) return source;

        const exactBlock = source.blockId ? blocks.find((block) => block.id === source.blockId) : undefined;
        const byExactId = resolveByCoordinates(exactBlock, source, keywordText);
        if (byExactId) return byExactId;

        const blockIndex = getSourceBlockIndex(source);
        const indexedBlock = blockIndex ? blocks.find((block) => block.blockIndex === blockIndex) : undefined;
        const byIndex = resolveByCoordinates(indexedBlock, source, keywordText);
        if (byIndex) return byIndex;

        if (indexedBlock) {
            const byContextInBlock = uniqueByContext([indexedBlock], source, keywordText);
            if (byContextInBlock) return byContextInBlock;
        }

        const byContext = uniqueByContext(blocks, source, keywordText);
        if (byContext) return byContext;

        const byUniqueTextInBlock = uniqueInBlock(indexedBlock, keywordText);
        if (byUniqueTextInBlock) return byUniqueTextInBlock;

        return source;
    }

    function resolveKeywordSources(keywords: AuditKingKeyword[], blocks: AuditKingTextBlock[]): AuditKingKeyword[] {
        return keywords.map((keyword) => ({
            ...keyword,
            source: resolveSource(keyword.source, blocks, keyword.text)
        }));
    }

    runtime.SourceLocator = {
        makeSource,
        resolveSource,
        resolveKeywordSources,
        parseLegacyBlockIndex
    };
})();
