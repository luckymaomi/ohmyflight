(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    type HighlightSegment = {
        text: string;
        keywordIds: string[];
        colors: string[];
    };

    function normalizeRanges(text: string, ranges: AuditKingHighlightRange[]): AuditKingHighlightRange[] {
        return ranges
            .map((range) => ({
                ...range,
                start: Math.max(0, Math.min(text.length, range.start)),
                end: Math.max(0, Math.min(text.length, range.end))
            }))
            .filter((range) => range.end > range.start)
            .sort((left, right) => left.start - right.start || left.end - right.end);
    }

    function buildHighlightSegments(text: string, ranges: AuditKingHighlightRange[]): HighlightSegment[] {
        const normalizedRanges = normalizeRanges(text, ranges);
        const boundaries = new Set<number>([0, text.length]);

        normalizedRanges.forEach((range) => {
            boundaries.add(range.start);
            boundaries.add(range.end);
        });

        const sortedBoundaries = Array.from(boundaries).sort((left, right) => left - right);
        const segments: HighlightSegment[] = [];

        for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
            const start = sortedBoundaries[index];
            const end = sortedBoundaries[index + 1];
            if (end <= start) continue;
            const active = normalizedRanges.filter((range) => range.start < end && range.end > start);
            segments.push({
                text: text.slice(start, end),
                keywordIds: active.map((range) => range.keywordId),
                colors: active.map((range) => range.color)
            });
        }

        return segments.filter((segment) => segment.text);
    }

    function buildContext(
        text: string,
        options: { start: number; end: number; before: number; after: number }
    ): { text: string; offset: number; truncatedStart: boolean; truncatedEnd: boolean } {
        const start = Math.max(0, options.start - options.before);
        const end = Math.min(text.length, options.end + options.after);
        return {
            text: text.slice(start, end),
            offset: start,
            truncatedStart: start > 0,
            truncatedEnd: end < text.length
        };
    }

    function buildFullContext(text: string): { text: string; offset: number; truncatedStart: boolean; truncatedEnd: boolean } {
        return {
            text,
            offset: 0,
            truncatedStart: false,
            truncatedEnd: false
        };
    }

    function buildBlockWindowContext(
        blocks: AuditKingTextBlock[],
        options: { blockId: string; matchStart: number; matchEnd: number; targetLength: number }
    ): { text: string; matchStart: number; matchEnd: number; truncatedStart: boolean; truncatedEnd: boolean } {
        const currentIndex = blocks.findIndex((block) => block.id === options.blockId);
        if (currentIndex < 0) {
            return {
                text: "",
                matchStart: 0,
                matchEnd: 0,
                truncatedStart: false,
                truncatedEnd: false
            };
        }

        let startIndex = currentIndex;
        let endIndex = currentIndex;
        let totalLength = blocks[currentIndex].text.length;
        let preferBefore = true;

        while (totalLength < options.targetLength && (startIndex > 0 || endIndex < blocks.length - 1)) {
            if (preferBefore && startIndex > 0) {
                startIndex -= 1;
                totalLength += blocks[startIndex].text.length + 2;
            } else if (!preferBefore && endIndex < blocks.length - 1) {
                endIndex += 1;
                totalLength += blocks[endIndex].text.length + 2;
            } else if (startIndex > 0) {
                startIndex -= 1;
                totalLength += blocks[startIndex].text.length + 2;
            } else if (endIndex < blocks.length - 1) {
                endIndex += 1;
                totalLength += blocks[endIndex].text.length + 2;
            }
            preferBefore = !preferBefore;
        }

        const selected = blocks.slice(startIndex, endIndex + 1);
        const beforeCurrent = blocks.slice(startIndex, currentIndex);
        const prefixLength = beforeCurrent.reduce((total, block) => total + block.text.length + 2, 0);
        const text = selected.map((block) => block.text).join("\n\n");

        return {
            text,
            matchStart: prefixLength + options.matchStart,
            matchEnd: prefixLength + options.matchEnd,
            truncatedStart: startIndex > 0,
            truncatedEnd: endIndex < blocks.length - 1
        };
    }

    runtime.Highlight = {
        buildHighlightSegments,
        buildContext,
        buildFullContext,
        buildBlockWindowContext
    };
})();
