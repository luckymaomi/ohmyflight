(function () {
    const runtime = window.ProofKing || (window.ProofKing = {});

    function requireNormalizer() {
        if (!runtime.Normalizer) {
            throw new Error("ProofKing.Normalizer is not loaded.");
        }
        return runtime.Normalizer;
    }

    function createFlexIndex(): any {
        const IndexCtor = window.FlexSearch?.Index;
        if (!IndexCtor) return null;
        return new IndexCtor({ tokenize: "full", cache: false });
    }

    function uniqueNumbers(values: number[]): number[] {
        return Array.from(new Set(values)).sort((left, right) => left - right);
    }

    function buildIndex(segments: ProofKingSegment[]): ProofKingSearchIndex {
        const normalizer = requireNormalizer();
        const grams: Record<string, number[]> = {};
        const flexIndex = createFlexIndex();
        (segments || []).forEach((segment, index) => {
            flexIndex?.add(index, segment.normalized);
            normalizer.gramsFor(segment.normalized).forEach((gram: string) => {
                if (!grams[gram]) grams[gram] = [];
                grams[gram].push(index);
            });
        });
        Object.keys(grams).forEach((gram) => {
            grams[gram] = uniqueNumbers(grams[gram]);
        });
        return { segments, grams, flexIndex };
    }

    function search(index: ProofKingSearchIndex, normalized: string, limit = 12): number[] {
        const normalizer = requireNormalizer();
        const query = normalizer.normalizeForMatch(normalized);
        if (!query) return [];
        const scores = new Map<number, number>();
        const flexResult = index.flexIndex?.search(query, limit * 2) || [];
        if (Array.isArray(flexResult)) {
            flexResult.map(Number).filter(Number.isInteger).forEach((candidateIndex: number, rank: number) => {
                scores.set(candidateIndex, (scores.get(candidateIndex) || 0) + Math.max(1, limit - rank));
            });
        }
        const queryGrams = normalizer.gramsFor(query);
        queryGrams.forEach((gram: string) => {
            (index.grams[gram] || []).forEach((candidateIndex) => {
                scores.set(candidateIndex, (scores.get(candidateIndex) || 0) + 1);
            });
        });
        if (!scores.size && query.length < 12) {
            index.segments.forEach((_segment, segmentIndex) => scores.set(segmentIndex, 1));
        }
        return Array.from(scores.entries())
            .sort((left, right) => right[1] - left[1] || left[0] - right[0])
            .slice(0, limit)
            .map(([candidateIndex]) => candidateIndex);
    }

    runtime.SearchIndex = {
        buildIndex,
        search
    };
})();
