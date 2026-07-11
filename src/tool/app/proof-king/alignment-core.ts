(function () {
    type Anchor = { myIndex: number; referenceIndex: number; exact: boolean; similarity: number };
    type Candidate = Anchor & { score: number; previous: number };

    const text = (globalThis as any).ManualProofText;

    function compare(
        myManual: WorkerManual,
        referenceManual: WorkerManual,
        options: ComparisonOptions = {},
        reportProgress?: (progress: ComparisonProgress) => void
    ): ManualComparison {
        requireTextEngine();
        reportProgress?.({ phase: "正在重建句子和条款", completed: 0, total: 1 });
        const mySlices = text.createSlices(myManual, options) as ComparisonSlice[];
        const referenceSlices = text.createSlices(referenceManual, options) as ComparisonSlice[];
        reportProgress?.({ phase: "正在建立唯一原文锚点", completed: 0, total: 1 });
        const exactAnchors = uniqueExactAnchors(mySlices, referenceSlices);
        const matches: Anchor[] = [];
        const boundaries: Anchor[] = [
            { myIndex: -1, referenceIndex: -1, exact: true, similarity: 1 },
            ...exactAnchors,
            { myIndex: mySlices.length, referenceIndex: referenceSlices.length, exact: true, similarity: 1 }
        ];

        for (let index = 0; index < boundaries.length - 1; index += 1) {
            const start = boundaries[index];
            const end = boundaries[index + 1];
            matches.push(...alignGap(mySlices, referenceSlices, start, end, options));
            if (end.myIndex < mySlices.length) matches.push(end);
            reportProgress?.({ phase: "正在按原文顺序对齐", completed: index + 1, total: boundaries.length - 1 });
        }

        const orderedMatches = deduplicateMatches(matches);
        reportProgress?.({ phase: "正在聚合完整修订事件", completed: 0, total: 1 });
        const rawEvents = buildEvents(mySlices, referenceSlices, orderedMatches);
        const events = attachContextAnchors(
            mergeRelatedEvents(rawEvents, mySlices, referenceSlices),
            mySlices,
            referenceSlices,
            orderedMatches
        )
            .sort((left, right) => eventPriority(left.kind) - eventPriority(right.kind)
                || firstSliceIndex(left, mySlices, referenceSlices) - firstSliceIndex(right, mySlices, referenceSlices));
        const sameSliceCount = orderedMatches.filter((match) => match.exact).length;

        return {
            mySlices,
            referenceSlices,
            events,
            summary: {
                myManualName: myManual.name,
                referenceManualName: referenceManual.name,
                mySliceCount: mySlices.length,
                referenceSliceCount: referenceSlices.length,
                exactAnchorCount: exactAnchors.length,
                sameSliceCount,
                referenceAddedCount: events.filter((event) => event.kind === "reference-added").length,
                referenceRemovedCount: events.filter((event) => event.kind === "reference-removed").length,
                modifiedCount: events.filter((event) => event.kind === "modified").length,
                reviewCount: events.filter((event) => event.kind === "review").length
            }
        };
    }

    function uniqueExactAnchors(mySlices: ComparisonSlice[], referenceSlices: ComparisonSlice[]): Anchor[] {
        const myPositions = positionsByNormalized(mySlices);
        const referencePositions = positionsByNormalized(referenceSlices);
        const candidates: Anchor[] = [];
        myPositions.forEach((myIndexes, normalized) => {
            const referenceIndexes = referencePositions.get(normalized) || [];
            if (normalized.length < 12 || myIndexes.length !== 1 || referenceIndexes.length !== 1) return;
            candidates.push({ myIndex: myIndexes[0], referenceIndex: referenceIndexes[0], exact: true, similarity: 1 });
        });
        candidates.sort((left, right) => left.myIndex - right.myIndex || left.referenceIndex - right.referenceIndex);
        return longestIncreasingAnchors(candidates);
    }

    function positionsByNormalized(slices: ComparisonSlice[]): Map<string, number[]> {
        const positions = new Map<string, number[]>();
        slices.forEach((slice, index) => {
            const indexes = positions.get(slice.normalized) || [];
            indexes.push(index);
            positions.set(slice.normalized, indexes);
        });
        return positions;
    }

    function longestIncreasingAnchors(candidates: Anchor[]): Anchor[] {
        const tails: number[] = [];
        const tailCandidateIndexes: number[] = [];
        const previous = new Int32Array(candidates.length);
        previous.fill(-1);
        candidates.forEach((candidate, candidateIndex) => {
            let low = 0;
            let high = tails.length;
            while (low < high) {
                const middle = Math.floor((low + high) / 2);
                if (tails[middle] < candidate.referenceIndex) low = middle + 1;
                else high = middle;
            }
            if (low === tails.length) {
                tails.push(candidate.referenceIndex);
                tailCandidateIndexes.push(candidateIndex);
            } else {
                tails[low] = candidate.referenceIndex;
                tailCandidateIndexes[low] = candidateIndex;
            }
            if (low > 0) previous[candidateIndex] = tailCandidateIndexes[low - 1];
        });
        if (!tailCandidateIndexes.length) return [];
        const result: Anchor[] = [];
        let cursor = tailCandidateIndexes[tailCandidateIndexes.length - 1];
        while (cursor >= 0) {
            result.push(candidates[cursor]);
            cursor = previous[cursor];
        }
        return result.reverse();
    }

    function alignGap(
        mySlices: ComparisonSlice[],
        referenceSlices: ComparisonSlice[],
        start: Anchor,
        end: Anchor,
        options: ComparisonOptions
    ): Anchor[] {
        const myStart = start.myIndex + 1;
        const myEnd = end.myIndex;
        const referenceStart = start.referenceIndex + 1;
        const referenceEnd = end.referenceIndex;
        if (myStart >= myEnd || referenceStart >= referenceEnd) return [];
        const minimum = Math.max(0.45, Math.min(0.9, options.minimumCandidateSimilarity ?? 0.56));
        const gramIndex = new Map<string, number[]>();
        const exactIndex = new Map<string, number[]>();
        for (let referenceIndex = referenceStart; referenceIndex < referenceEnd; referenceIndex += 1) {
            const slice = referenceSlices[referenceIndex];
            const exact = exactIndex.get(slice.normalized) || [];
            exact.push(referenceIndex);
            exactIndex.set(slice.normalized, exact);
            slice.grams.forEach((gram) => {
                const indexes = gramIndex.get(gram) || [];
                indexes.push(referenceIndex);
                gramIndex.set(gram, indexes);
            });
        }
        const candidates: Candidate[] = [];
        for (let myIndex = myStart; myIndex < myEnd; myIndex += 1) {
            const mySlice = mySlices[myIndex];
            const exact = exactIndex.get(mySlice.normalized) || [];
            const counts = new Map<number, number>();
            if (exact.length) exact.forEach((referenceIndex) => counts.set(referenceIndex, Number.MAX_SAFE_INTEGER));
            else mySlice.grams.forEach((gram) => {
                (gramIndex.get(gram) || []).forEach((referenceIndex) => {
                    counts.set(referenceIndex, (counts.get(referenceIndex) || 0) + 1);
                });
            });
            Array.from(counts.entries())
                .sort((left, right) => right[1] - left[1] || left[0] - right[0])
                .slice(0, 18)
                .forEach(([referenceIndex]) => {
                    const similarity = text.similarity(mySlice.text, referenceSlices[referenceIndex].text) as number;
                    if (similarity < minimum) return;
                    const exactMatch = mySlice.normalized === referenceSlices[referenceIndex].normalized;
                    const myPosition = (myIndex - myStart) / Math.max(1, myEnd - myStart - 1);
                    const referencePosition = (referenceIndex - referenceStart) / Math.max(1, referenceEnd - referenceStart - 1);
                    const positionBonus = Math.max(0, 1 - Math.abs(myPosition - referencePosition)) * 0.2;
                    candidates.push({
                        myIndex,
                        referenceIndex,
                        exact: exactMatch,
                        similarity,
                        score: (exactMatch ? 5 : 0.4 + (similarity - minimum) * 4) + positionBonus,
                        previous: -1
                    });
                });
        }
        return maximumWeightChain(candidates, referenceStart, referenceEnd);
    }

    function maximumWeightChain(candidates: Candidate[], referenceStart: number, referenceEnd: number): Anchor[] {
        if (!candidates.length) return [];
        candidates.sort((left, right) => left.myIndex - right.myIndex || left.referenceIndex - right.referenceIndex);
        const size = referenceEnd - referenceStart + 2;
        const bestScores = new Float64Array(size);
        const bestNodes = new Int32Array(size);
        bestNodes.fill(-1);
        let groupStart = 0;
        while (groupStart < candidates.length) {
            let groupEnd = groupStart + 1;
            while (groupEnd < candidates.length && candidates[groupEnd].myIndex === candidates[groupStart].myIndex) groupEnd += 1;
            const pending: Array<{ position: number; score: number; node: number }> = [];
            for (let index = groupStart; index < groupEnd; index += 1) {
                const candidate = candidates[index];
                const position = candidate.referenceIndex - referenceStart + 1;
                const previousBest = fenwickQuery(bestScores, bestNodes, position - 1);
                candidate.score += previousBest.score;
                candidate.previous = previousBest.node;
                pending.push({ position, score: candidate.score, node: index });
            }
            pending.forEach((item) => fenwickUpdate(bestScores, bestNodes, item.position, item.score, item.node));
            groupStart = groupEnd;
        }
        const best = fenwickQuery(bestScores, bestNodes, size - 1);
        const result: Anchor[] = [];
        let cursor = best.node;
        while (cursor >= 0) {
            const candidate = candidates[cursor];
            result.push({
                myIndex: candidate.myIndex,
                referenceIndex: candidate.referenceIndex,
                exact: candidate.exact,
                similarity: candidate.similarity
            });
            cursor = candidate.previous;
        }
        return result.reverse();
    }

    function fenwickQuery(scores: Float64Array, nodes: Int32Array, position: number): { score: number; node: number } {
        let bestScore = 0;
        let bestNode = -1;
        for (let index = position; index > 0; index -= index & -index) {
            if (scores[index] > bestScore) {
                bestScore = scores[index];
                bestNode = nodes[index];
            }
        }
        return { score: bestScore, node: bestNode };
    }

    function fenwickUpdate(scores: Float64Array, nodes: Int32Array, position: number, score: number, node: number): void {
        for (let index = position; index < scores.length; index += index & -index) {
            if (score <= scores[index]) continue;
            scores[index] = score;
            nodes[index] = node;
        }
    }

    function deduplicateMatches(matches: Anchor[]): Anchor[] {
        const result: Anchor[] = [];
        const usedMy = new Set<number>();
        const usedReference = new Set<number>();
        matches.sort((left, right) => left.myIndex - right.myIndex || left.referenceIndex - right.referenceIndex);
        matches.forEach((match) => {
            if (usedMy.has(match.myIndex) || usedReference.has(match.referenceIndex)) return;
            const previous = result[result.length - 1];
            if (previous && match.referenceIndex <= previous.referenceIndex) return;
            usedMy.add(match.myIndex);
            usedReference.add(match.referenceIndex);
            result.push(match);
        });
        return result;
    }

    function buildEvents(
        mySlices: ComparisonSlice[],
        referenceSlices: ComparisonSlice[],
        matches: Anchor[]
    ): RevisionEvent[] {
        const events: RevisionEvent[] = [];
        let myCursor = 0;
        let referenceCursor = 0;
        matches.forEach((match) => {
            addGapEvents(events, mySlices.slice(myCursor, match.myIndex), referenceSlices.slice(referenceCursor, match.referenceIndex));
            if (!match.exact) events.push(makeEvent("modified", [mySlices[match.myIndex]], [referenceSlices[match.referenceIndex]]));
            myCursor = match.myIndex + 1;
            referenceCursor = match.referenceIndex + 1;
        });
        addGapEvents(events, mySlices.slice(myCursor), referenceSlices.slice(referenceCursor));
        return events;
    }

    function addGapEvents(events: RevisionEvent[], myGap: ComparisonSlice[], referenceGap: ComparisonSlice[]): void {
        if (!myGap.length && !referenceGap.length) return;
        if (!myGap.length) {
            chunkSlices(referenceGap).forEach((chunk) => events.push(makeEvent("reference-added", [], chunk)));
            return;
        }
        if (!referenceGap.length) {
            chunkSlices(myGap).forEach((chunk) => events.push(makeEvent("reference-removed", chunk, [])));
            return;
        }
        const aggregateSimilarity = text.similarity(joinSliceText(myGap), joinSliceText(referenceGap)) as number;
        const myLength = joinNormalizedLength(myGap);
        const referenceLength = joinNormalizedLength(referenceGap);
        const lengthRatio = Math.min(myLength, referenceLength) / Math.max(1, myLength, referenceLength);
        if (aggregateSimilarity >= 0.34 && lengthRatio >= 0.28 && myGap.length <= 12 && referenceGap.length <= 12) {
            events.push(makeEvent(aggregateSimilarity >= 0.46 ? "modified" : "review", myGap, referenceGap));
            return;
        }
        chunkSlices(myGap).forEach((chunk) => events.push(makeEvent("reference-removed", chunk, [])));
        chunkSlices(referenceGap).forEach((chunk) => events.push(makeEvent("reference-added", [], chunk)));
    }

    function chunkSlices(slices: ComparisonSlice[]): ComparisonSlice[][] {
        const chunks: ComparisonSlice[][] = [];
        slices.forEach((slice) => {
            const current = chunks[chunks.length - 1];
            const previous = current?.[current.length - 1];
            const sameContext = !!previous && (
                previous.unitId === slice.unitId
                || (!!previous.title && previous.title === slice.title && current.length < 8)
            );
            if (sameContext) current.push(slice);
            else chunks.push([slice]);
        });
        return chunks;
    }

    function makeEvent(kind: RevisionKind, mySlices: ComparisonSlice[], referenceSlices: ComparisonSlice[]): RevisionEvent {
        const myText = joinSliceText(mySlices);
        const referenceText = joinSliceText(referenceSlices);
        const similarity = myText && referenceText ? text.similarity(myText, referenceText) as number : 0;
        const tokenDifference = text.compareTokens(
            Array.from(new Set(mySlices.flatMap((slice) => slice.tokens))),
            Array.from(new Set(referenceSlices.flatMap((slice) => slice.tokens)))
        ) as { leftOnly: string[]; rightOnly: string[] };
        const diff = text.inlineDiff(myText, referenceText) as { left: DiffSegment[]; right: DiffSegment[] };
        return {
            id: "",
            kind,
            title: referenceSlices.find((slice) => slice.title)?.title || mySlices.find((slice) => slice.title)?.title || label(kind),
            mySliceIds: mySlices.map((slice) => slice.id),
            referenceSliceIds: referenceSlices.map((slice) => slice.id),
            myUnitIds: Array.from(new Set(mySlices.map((slice) => slice.unitId))),
            referenceUnitIds: Array.from(new Set(referenceSlices.map((slice) => slice.unitId))),
            myText,
            referenceText,
            myLocation: rangeLocation(mySlices),
            referenceLocation: rangeLocation(referenceSlices),
            similarity: round(similarity),
            myTokensOnly: tokenDifference.leftOnly,
            referenceTokensOnly: tokenDifference.rightOnly,
            myDiff: diff.left,
            referenceDiff: diff.right,
            contextAnchors: [],
            reason: reason(kind, tokenDifference.leftOnly.length > 0 || tokenDifference.rightOnly.length > 0)
        };
    }

    function attachContextAnchors(
        events: RevisionEvent[],
        mySlices: ComparisonSlice[],
        referenceSlices: ComparisonSlice[],
        matches: Anchor[]
    ): RevisionEvent[] {
        const myIndexes = new Map(mySlices.map((slice, index) => [slice.id, index]));
        const referenceIndexes = new Map(referenceSlices.map((slice, index) => [slice.id, index]));
        return events.map((event) => {
            if (event.kind !== "reference-added" && event.kind !== "reference-removed") return event;
            const usesReference = event.kind === "reference-added";
            const ids = usesReference ? event.referenceSliceIds : event.mySliceIds;
            const indexes = ids
                .map((id) => (usesReference ? referenceIndexes : myIndexes).get(id))
                .filter((index): index is number => index !== undefined);
            if (!indexes.length) return event;
            const firstIndex = Math.min(...indexes);
            const lastIndex = Math.max(...indexes);
            const sideIndex = (match: Anchor) => usesReference ? match.referenceIndex : match.myIndex;
            const exactMatches = matches.filter((match) => match.exact);
            const before = exactMatches.filter((match) => sideIndex(match) < firstIndex).at(-1);
            const after = exactMatches.find((match) => sideIndex(match) > lastIndex);
            const contextAnchors = [
                before && makeContextAnchor("before", before, mySlices, referenceSlices),
                after && makeContextAnchor("after", after, mySlices, referenceSlices)
            ].filter(Boolean) as RevisionContextAnchor[];
            return { ...event, contextAnchors };
        });
    }

    function makeContextAnchor(
        position: "before" | "after",
        match: Anchor,
        mySlices: ComparisonSlice[],
        referenceSlices: ComparisonSlice[]
    ): RevisionContextAnchor {
        const mySlice = mySlices[match.myIndex];
        const referenceSlice = referenceSlices[match.referenceIndex];
        return {
            position,
            mySliceId: mySlice.id,
            referenceSliceId: referenceSlice.id,
            myUnitId: mySlice.unitId,
            referenceUnitId: referenceSlice.unitId,
            myText: mySlice.text,
            referenceText: referenceSlice.text,
            myUnitIndex: mySlice.unitIndex,
            referenceUnitIndex: referenceSlice.unitIndex,
            myPageNumber: mySlice.pageNumber,
            referencePageNumber: referenceSlice.pageNumber
        };
    }

    function mergeRelatedEvents(
        input: RevisionEvent[],
        mySlices: ComparisonSlice[],
        referenceSlices: ComparisonSlice[]
    ): RevisionEvent[] {
        const myById = new Map(mySlices.map((slice) => [slice.id, slice]));
        const referenceById = new Map(referenceSlices.map((slice) => [slice.id, slice]));
        const result: RevisionEvent[] = [];
        input.forEach((event) => {
            const previous = result[result.length - 1];
            const mergeableKinds = previous && (
                (previous.kind === "modified" && (event.kind === "reference-added" || event.kind === "reference-removed"))
                || (event.kind === "modified" && (previous.kind === "reference-added" || previous.kind === "reference-removed"))
            );
            const sameContext = previous && (
                sharesAny(previous.myUnitIds, event.myUnitIds)
                || sharesAny(previous.referenceUnitIds, event.referenceUnitIds)
                || (!!previous.title && previous.title === event.title)
            );
            const structuralContinuation = previous
                && previous.kind === event.kind
                && (event.kind === "reference-added" || event.kind === "reference-removed")
                && eventsAreContiguous(previous, event, myById, referenceById)
                && (isShortHeading(previous.myText || previous.referenceText) || (!!previous.title && previous.title === event.title));
            const mergedMy = previous
                ? [...previous.mySliceIds, ...event.mySliceIds].map((id) => myById.get(id)).filter(Boolean) as ComparisonSlice[]
                : [];
            const mergedReference = previous
                ? [...previous.referenceSliceIds, ...event.referenceSliceIds].map((id) => referenceById.get(id)).filter(Boolean) as ComparisonSlice[]
                : [];
            const balancedModification = mergeableKinds
                && sameContext
                && isBalancedModification(mergedMy, mergedReference);
            if (!balancedModification && !structuralContinuation) {
                result.push(event);
                return;
            }
            result[result.length - 1] = makeEvent(structuralContinuation ? event.kind : "modified", mergedMy, mergedReference);
        });
        return result.map((event, index) => ({ ...event, id: `revision-${index + 1}` }));
    }

    function sharesAny(left: string[], right: string[]): boolean {
        const rightSet = new Set(right);
        return left.some((value) => rightSet.has(value));
    }

    function eventsAreContiguous(
        left: RevisionEvent,
        right: RevisionEvent,
        myById: Map<string, ComparisonSlice>,
        referenceById: Map<string, ComparisonSlice>
    ): boolean {
        const side = left.referenceSliceIds.length ? "reference" : "my";
        const leftIds = side === "reference" ? left.referenceSliceIds : left.mySliceIds;
        const rightIds = side === "reference" ? right.referenceSliceIds : right.mySliceIds;
        const map = side === "reference" ? referenceById : myById;
        const leftIndex = map.get(leftIds[leftIds.length - 1])?.index;
        const rightIndex = map.get(rightIds[0])?.index;
        return leftIndex !== undefined && rightIndex === leftIndex + 1;
    }

    function isShortHeading(value: string): boolean {
        const normalized = String(value || "").replace(/\s+/g, "").trim();
        return normalized.length >= 2 && normalized.length <= 40 && !/[。；！？!?]$/.test(normalized);
    }

    function isBalancedModification(mySlices: ComparisonSlice[], referenceSlices: ComparisonSlice[]): boolean {
        const myLength = joinNormalizedLength(mySlices);
        const referenceLength = joinNormalizedLength(referenceSlices);
        const lengthRatio = Math.min(myLength, referenceLength) / Math.max(1, myLength, referenceLength);
        if (lengthRatio < 0.28) return false;
        return text.similarity(joinSliceText(mySlices), joinSliceText(referenceSlices)) >= 0.34;
    }

    function joinSliceText(slices: ComparisonSlice[]): string {
        return slices.map((slice) => slice.text).join("\n");
    }

    function joinNormalizedLength(slices: ComparisonSlice[]): number {
        return slices.reduce((total, slice) => total + slice.normalized.length, 0);
    }

    function rangeLocation(slices: ComparisonSlice[]): string {
        if (!slices.length) return "无对应原文";
        const first = slices[0];
        const last = slices[slices.length - 1];
        const describe = (slice: ComparisonSlice) => slice.pageNumber
            ? `第 ${slice.pageNumber} 页`
            : `第 ${slice.unitIndex} 段`;
        return describe(first) === describe(last) ? describe(first) : `${describe(first)} - ${describe(last)}`;
    }

    function label(kind: RevisionKind): string {
        const labels: Record<RevisionKind, string> = {
            "reference-added": "参考手册新增",
            "reference-removed": "参考手册删除",
            modified: "内容修改",
            review: "待人工确认"
        };
        return labels[kind];
    }

    function reason(kind: RevisionKind, tokenChanged: boolean): string {
        if (kind === "reference-added") return "参考手册存在连续原文，我的手册在对应顺序范围内没有可靠对应。";
        if (kind === "reference-removed") return "我的手册存在连续原文，参考手册在对应顺序范围内没有可靠对应。";
        if (kind === "review") return "两侧位于相同顺序区间，但文字对应关系不足以自动确认。";
        return tokenChanged ? "对应内容中的数字或英文标识发生变化。" : "对应内容存在文字增删或替换。";
    }

    function eventPriority(kind: RevisionKind): number {
        return { "reference-added": 0, "reference-removed": 1, modified: 2, review: 3 }[kind];
    }

    function firstSliceIndex(event: RevisionEvent, mySlices: ComparisonSlice[], referenceSlices: ComparisonSlice[]): number {
        const myIndexes = new Map(mySlices.map((slice) => [slice.id, slice.index]));
        const referenceIndexes = new Map(referenceSlices.map((slice) => [slice.id, slice.index]));
        return event.referenceSliceIds.length
            ? referenceIndexes.get(event.referenceSliceIds[0]) || 0
            : myIndexes.get(event.mySliceIds[0]) || 0;
    }

    function round(value: number): number {
        return Math.round(value * 1000) / 1000;
    }

    function requireTextEngine(): void {
        if (!text?.createSlices) throw new Error("ManualProofText is not loaded.");
    }

    (globalThis as any).ManualProofAlignment = {
        compare,
        uniqueExactAnchors,
        alignGap,
        rangeLocation
    };
})();
