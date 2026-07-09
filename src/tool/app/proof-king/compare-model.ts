(function () {
    const runtime = window.ProofKing || (window.ProofKing = {});

    function requireModule(name: string) {
        if (!runtime[name]) {
            throw new Error(`ProofKing.${name} is not loaded.`);
        }
        return runtime[name];
    }

    function compareDocuments(sourceDocument: ProofKingDocument, targetDocument: ProofKingDocument): ProofKingCompareResult {
        const segmenter = requireModule("Segmenter");
        const searchIndex = requireModule("SearchIndex");
        const sourceSegments = filterRepeatedShortSegments(segmenter.segmentDocument(sourceDocument) as ProofKingSegment[]);
        const targetSegments = filterRepeatedShortSegments(segmenter.segmentDocument(targetDocument) as ProofKingSegment[]);
        const targetIndex = searchIndex.buildIndex(targetSegments) as ProofKingSearchIndex;
        const sourceIndex = searchIndex.buildIndex(sourceSegments) as ProofKingSearchIndex;

        const rows = sourceSegments.map((segment, index) => classifySourceSegment(segment, index, targetSegments, targetIndex));
        const additions = targetSegments
            .map((segment, index) => classifySourceSegment(segment, index, sourceSegments, sourceIndex))
            .filter((row) => row.status === "deleted")
            .map((row) => ({ ...row, status: "deleted" as const, reason: "新版内容在基准手册中未找到可靠对应。" }));
        const conflicts = rows.filter((row) => row.status === "modified" && (row.missingTokens.length || row.extraTokens.length));
        const summary = summarize(sourceDocument, targetDocument, sourceSegments, targetSegments, rows, additions, conflicts);

        return {
            sourceDocument,
            targetDocument,
            sourceSegments,
            targetSegments,
            rows,
            additions,
            conflicts,
            summary
        };
    }

    function classifySourceSegment(
        segment: ProofKingSegment,
        index: number,
        targetSegments: ProofKingSegment[],
        targetIndex: ProofKingSearchIndex
    ): ProofKingCompareRow {
        const searchIndex = requireModule("SearchIndex");
        const candidateIndexes = searchIndex.search(targetIndex, segment.normalized, 10) as number[];
        const best = findBestMatch(segment, candidateIndexes, targetSegments);
        const hasKeyTokenDifference = !!best && (best.missingTokens.length > 0 || best.extraTokens.length > 0);
        const weakButComparable = !!best && hasKeyTokenDifference && (best.similarity >= 0.32 || best.coverage >= 0.35);
        if (!best || (!weakButComparable && best.similarity < 0.42 && best.coverage < 0.52)) {
            return {
                id: `compare-${index + 1}`,
                status: "deleted",
                source: segment,
                similarity: 0,
                coverage: 0,
                reason: "待校对手册中未找到可靠对应。",
                missingTokens: segment.keyTokens,
                extraTokens: []
            };
        }
        const status = classifyStatus(best);
        return {
            id: `compare-${index + 1}`,
            status,
            source: segment,
            target: best,
            similarity: roundMetric(best.similarity),
            coverage: roundMetric(best.coverage),
            reason: reasonForStatus(status, best),
            missingTokens: best.missingTokens,
            extraTokens: best.extraTokens
        };
    }

    function filterRepeatedShortSegments(segments: ProofKingSegment[]): ProofKingSegment[] {
        const counts = new Map<string, number>();
        (segments || []).forEach((segment) => {
            if (!segment.normalized) return;
            counts.set(segment.normalized, (counts.get(segment.normalized) || 0) + 1);
        });
        return (segments || []).filter((segment) => {
            const count = counts.get(segment.normalized) || 0;
            if (count < 5) return true;
            if (segment.normalized.length > 50) return true;
            return false;
        });
    }

    function findBestMatch(segment: ProofKingSegment, candidateIndexes: number[], targetSegments: ProofKingSegment[]): ProofKingCompareMatch | null {
        const candidates = candidateIndexes.flatMap((candidateIndex) => buildCandidateWindows(candidateIndex, targetSegments))
            .map((candidate) => scoreCandidate(segment, candidate))
            .sort((left, right) => right.similarity - left.similarity
                || right.coverage - left.coverage
                || right.keyTokenRatio - left.keyTokenRatio);
        return candidates[0] || null;
    }

    function buildCandidateWindows(candidateIndex: number, segments: ProofKingSegment[]): Array<{ segment: ProofKingSegment; text: string; normalized: string; centerNormalized: string; location: string; keyTokens: string[] }> {
        const normalizer = requireModule("Normalizer");
        const windows: Array<{ segment: ProofKingSegment; text: string; normalized: string; centerNormalized: string; location: string; keyTokens: string[] }> = [];
        if (candidateIndex < 0 || candidateIndex >= segments.length) return windows;
        const start = Math.max(0, candidateIndex - 1);
        const end = Math.min(segments.length - 1, candidateIndex + 1);
        const group = segments.slice(start, end + 1);
        const text = group.map((item) => item.text).join("\n");
        const keyTokens = Array.from(new Set(group.flatMap((item) => item.keyTokens))).sort();
        windows.push({
            segment: segments[candidateIndex],
            text,
            normalized: normalizer.normalizeForMatch(text),
            centerNormalized: segments[candidateIndex].normalized,
            location: group.map((item) => normalizer.locationOf(item)).join(" ~ "),
            keyTokens
        });
        return windows;
    }

    function scoreCandidate(
        segment: ProofKingSegment,
        candidate: { segment: ProofKingSegment; text: string; normalized: string; centerNormalized: string; location: string; keyTokens: string[] }
    ): ProofKingCompareMatch {
        const normalizer = requireModule("Normalizer");
        if (candidate.segment.normalized === segment.normalized) {
            const tokenStats = compareTokens(segment.keyTokens, candidate.segment.keyTokens);
            return {
                segment: candidate.segment,
                windowText: candidate.text,
                windowNormalized: candidate.normalized,
                windowLocation: candidate.location,
                similarity: 1,
                coverage: 1,
                reverseCoverage: 1,
                keyTokenRatio: tokenStats.ratio,
                missingTokens: tokenStats.missing,
                extraTokens: tokenStats.extra
            };
        }
        const sourceGrams = normalizer.gramsFor(segment.normalized) as string[];
        const targetGrams = normalizer.gramsFor(candidate.normalized) as string[];
        const centerGrams = normalizer.gramsFor(candidate.centerNormalized) as string[];
        const targetSet = new Set(targetGrams);
        const centerSet = new Set(centerGrams);
        const sourceSet = new Set(sourceGrams);
        const overlap = sourceGrams.filter((gram) => targetSet.has(gram)).length;
        const reverseOverlap = targetGrams.filter((gram) => sourceSet.has(gram)).length;
        const centerOverlap = sourceGrams.filter((gram) => centerSet.has(gram)).length;
        const coverage = sourceGrams.length ? overlap / sourceGrams.length : 0;
        const centerCoverage = sourceGrams.length ? centerOverlap / sourceGrams.length : 0;
        const reverseCoverage = targetGrams.length ? reverseOverlap / targetGrams.length : 0;
        const dice = sourceGrams.length + targetGrams.length ? (2 * overlap) / (sourceGrams.length + targetGrams.length) : 0;
        const tokenStats = compareTokens(segment.keyTokens, candidate.segment.keyTokens);
        const containsBoost = candidate.normalized.includes(segment.normalized) || segment.normalized.includes(candidate.segment.normalized) ? 0.08 : 0;
        const centerPenalty = centerCoverage < 0.28 ? 0.25 : 0;
        const similarity = Math.max(0, Math.min(1, dice * 0.62 + coverage * 0.28 + tokenStats.ratio * 0.1 + containsBoost - centerPenalty));
        return {
            segment: candidate.segment,
            windowText: candidate.text,
            windowNormalized: candidate.normalized,
            windowLocation: candidate.location,
            similarity,
            coverage,
            reverseCoverage,
            keyTokenRatio: tokenStats.ratio,
            missingTokens: tokenStats.missing,
            extraTokens: tokenStats.extra
        };
    }

    function compareTokens(sourceTokens: string[], targetTokens: string[]): { ratio: number; missing: string[]; extra: string[] } {
        const sourceSet = new Set(sourceTokens || []);
        const targetSet = new Set(targetTokens || []);
        const missing = Array.from(sourceSet).filter((token) => !targetSet.has(token));
        const extra = Array.from(targetSet).filter((token) => !sourceSet.has(token));
        const shared = Array.from(sourceSet).filter((token) => targetSet.has(token)).length;
        const total = Math.max(sourceSet.size, targetSet.size, 1);
        return {
            ratio: shared / total,
            missing,
            extra
        };
    }

    function classifyStatus(match: ProofKingCompareMatch): "same" | "modified" | "review" {
        if (match.similarity >= 0.9 && match.coverage >= 0.88 && !match.missingTokens.length && !match.extraTokens.length) {
            return "same";
        }
        if ((match.missingTokens.length || match.extraTokens.length) && (match.similarity >= 0.32 || match.coverage >= 0.35)) {
            return "modified";
        }
        if (match.similarity >= 0.58 || match.coverage >= 0.66) {
            return "modified";
        }
        return "review";
    }

    function reasonForStatus(status: string, match: ProofKingCompareMatch): string {
        if (status === "same") return "内容高度一致。";
        if (status === "modified" && (match.missingTokens.length || match.extraTokens.length)) return "相似内容存在关键数字、英文或条款号差异。";
        if (status === "modified") return "找到相似内容，文字存在变化。";
        return "找到弱候选，需要人工确认。";
    }

    function summarize(
        sourceDocument: ProofKingDocument,
        targetDocument: ProofKingDocument,
        sourceSegments: ProofKingSegment[],
        targetSegments: ProofKingSegment[],
        rows: ProofKingCompareRow[],
        additions: ProofKingCompareRow[],
        conflicts: ProofKingCompareRow[]
    ): ProofKingCompareSummary {
        const counts = {
            same: rows.filter((row) => row.status === "same").length,
            modified: rows.filter((row) => row.status === "modified").length,
            deleted: rows.filter((row) => row.status === "deleted").length,
            review: rows.filter((row) => row.status === "review").length
        };
        const matchedWeight = rows
            .filter((row) => row.status !== "deleted")
            .reduce((total, row) => total + row.source.weight * Math.max(row.coverage, row.similarity), 0);
        const totalWeight = sourceSegments.reduce((total, segment) => total + segment.weight, 0);
        const averageSimilarity = rows.length
            ? rows.reduce((total, row) => total + row.similarity, 0) / rows.length
            : 0;
        return {
            sourceName: sourceDocument.name,
            targetName: targetDocument.name,
            sourceSegments: sourceSegments.length,
            targetSegments: targetSegments.length,
            same: counts.same,
            modified: counts.modified,
            deleted: counts.deleted,
            review: counts.review,
            added: additions.length,
            conflicts: conflicts.length,
            coverageRate: roundMetric(totalWeight ? matchedWeight / totalWeight : 0),
            averageSimilarity: roundMetric(averageSimilarity)
        };
    }

    function statusText(status: string): string {
        const map: Record<string, string> = {
            same: "一致",
            modified: "修改",
            deleted: "删除",
            review: "需确认"
        };
        return map[status] || status;
    }

    function roundMetric(value: number): number {
        return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
    }

    runtime.CompareModel = {
        compareDocuments,
        classifySourceSegment,
        filterRepeatedShortSegments,
        statusText,
        roundMetric
    };
})();
