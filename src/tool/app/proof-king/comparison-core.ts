(function () {
    type CandidateWindow = {
        referenceSlice: ManualSlice;
        referenceWindowSliceIds: string[];
        normalized: string;
        keyTokens: string[];
    };

    type MatchScore = ReferenceMatch & {
        exact: boolean;
    };

    type ReferenceLookup = {
        exact: Map<string, number[]>;
        grams: Map<string, number[]>;
        flexIndex: any;
    };

    function normalizeForMatch(value: unknown): string {
        return String(value ?? "")
            .normalize("NFKC")
            .toLowerCase()
            .replace(/\u00a0|\u3000/g, " ")
            .replace(/^\s*\d+(?:\.\d+){0,6}\s*/, "")
            .replace(/^\s*[（(]\s*\d+\s*[）)]\s*/, "")
            .replace(/^\s*[一二三四五六七八九十]+[、.．]\s*/, "")
            .replace(/[^0-9a-z\u4e00-\u9fff]+/g, "");
    }

    function extractKeyTokens(value: unknown): string[] {
        const text = String(value ?? "").normalize("NFKC").toLowerCase();
        const tokens = new Set<string>();
        [
            /\b[a-z]{2,}[a-z0-9-]*\b/g,
            /\b\d+(?:\.\d+)+\b/g,
            /\d+\s*(?:小时|分钟|天|日|月|年|米|公里|海里|次|个|名|人|级)/g,
            /\b\d{2,}\b/g
        ].forEach((pattern) => {
            (text.match(pattern) || []).forEach((token) => {
                const cleaned = token.replace(/\s+/g, "");
                if (cleaned.length >= 2) tokens.add(cleaned);
            });
        });
        return Array.from(tokens).sort();
    }

    function grams(value: string, size = 2): string[] {
        const text = normalizeForMatch(value);
        if (!text) return [];
        if (text.length <= size) return [text];
        const result = new Set<string>();
        for (let index = 0; index <= text.length - size; index += 1) {
            result.add(text.slice(index, index + size));
        }
        return Array.from(result);
    }

    function splitAt(value: string, boundaries: Set<string>): string[] {
        const parts: string[] = [];
        let current = "";
        Array.from(String(value || "")).forEach((character) => {
            current += character;
            if (!boundaries.has(character)) return;
            const part = current.trim();
            if (part) parts.push(part);
            current = "";
        });
        const tail = current.trim();
        if (tail) parts.push(tail);
        return parts;
    }

    function splitLongText(value: string): string[] {
        const strongParts = splitAt(value, new Set(["\n", "。", "！", "？", "!", "?", "；", ";"]));
        const result: string[] = [];
        strongParts.forEach((strongPart) => {
            if (normalizeForMatch(strongPart).length <= 90) {
                result.push(strongPart);
                return;
            }
            const softParts = splitAt(strongPart, new Set(["，", ",", "、", "：", ":"]));
            if (softParts.length <= 1) {
                result.push(...makeSlidingWindows(strongPart));
                return;
            }
            let buffer = "";
            softParts.forEach((softPart) => {
                const next = `${buffer}${softPart}`;
                if (buffer && normalizeForMatch(next).length > 72) {
                    result.push(buffer.trim());
                    buffer = softPart;
                    return;
                }
                buffer = next;
            });
            if (buffer.trim()) result.push(buffer.trim());
        });
        return result;
    }

    function makeSlidingWindows(value: string): string[] {
        const characters = Array.from(String(value || "").trim());
        const result: string[] = [];
        const size = 70;
        const step = 50;
        for (let index = 0; index < characters.length; index += step) {
            const part = characters.slice(index, index + size).join("").trim();
            if (part) result.push(part);
            if (index + size >= characters.length) break;
        }
        return result;
    }

    function createSlices(manual: WorkerManual, options: ComparisonOptions = {}): ManualSlice[] {
        const weakPhrases = new Set((options.weakPhrases || []).map(normalizeForMatch).filter(Boolean));
        const slices: ManualSlice[] = [];
        manual.units.forEach((unit) => {
            splitLongText(unit.text).forEach((text) => {
                const normalized = normalizeForMatch(text);
                const keyTokens = extractKeyTokens(text);
                if (!normalized || /^\d+$/.test(normalized)) return;
                if (normalized.length < 8 && keyTokens.length === 0) return;
                if (weakPhrases.has(normalized)) return;
                slices.push({
                    id: `${manual.id}-slice-${slices.length + 1}`,
                    manualId: manual.id,
                    manualName: manual.name,
                    sliceIndex: slices.length + 1,
                    unitId: unit.id,
                    unitIndex: unit.unitIndex,
                    title: unit.title,
                    pageNumber: unit.pageNumber,
                    text,
                    normalized,
                    keyTokens,
                    weight: Math.max(8, normalized.length)
                });
            });
        });
        return filterRepeatedShortSlices(slices);
    }

    function filterRepeatedShortSlices(slices: ManualSlice[]): ManualSlice[] {
        const counts = new Map<string, number>();
        slices.forEach((slice) => {
            counts.set(slice.normalized, (counts.get(slice.normalized) || 0) + 1);
        });
        return slices.filter((slice) => {
            const repeated = counts.get(slice.normalized) || 0;
            return repeated < 5 || slice.normalized.length > 50;
        });
    }

    function buildReferenceLookup(referenceSlices: ManualSlice[]): ReferenceLookup {
        const exact = new Map<string, number[]>();
        const gramMap = new Map<string, number[]>();
        const FlexIndex = (globalThis as any).FlexSearch?.Index;
        const flexIndex = FlexIndex ? new FlexIndex({ tokenize: "full", cache: false }) : null;
        referenceSlices.forEach((slice, index) => {
            const exactIndexes = exact.get(slice.normalized) || [];
            exactIndexes.push(index);
            exact.set(slice.normalized, exactIndexes);
            flexIndex?.add(index, slice.normalized);
            grams(slice.normalized).forEach((gram) => {
                const indexes = gramMap.get(gram) || [];
                indexes.push(index);
                gramMap.set(gram, indexes);
            });
        });
        return { exact, grams: gramMap, flexIndex };
    }

    function candidateIndexes(mySlice: ManualSlice, lookup: ReferenceLookup, referenceSlices: ManualSlice[]): number[] {
        const exact = lookup.exact.get(mySlice.normalized);
        if (exact?.length) return exact.slice(0, 4);
        const scores = new Map<number, number>();
        const flexResults = lookup.flexIndex?.search(mySlice.normalized, 20) || [];
        if (Array.isArray(flexResults)) {
            flexResults.map(Number).filter(Number.isInteger).forEach((index: number, rank: number) => {
                scores.set(index, (scores.get(index) || 0) + Math.max(1, 20 - rank));
            });
        }
        grams(mySlice.normalized).forEach((gram) => {
            (lookup.grams.get(gram) || []).forEach((index) => {
                scores.set(index, (scores.get(index) || 0) + 1);
            });
        });
        if (!scores.size && mySlice.normalized.length < 12) {
            referenceSlices.forEach((_slice, index) => scores.set(index, 1));
        }
        return Array.from(scores.entries())
            .sort((left, right) => right[1] - left[1] || left[0] - right[0])
            .slice(0, 10)
            .map(([index]) => index);
    }

    function makeReferenceWindow(index: number, referenceSlices: ManualSlice[]): CandidateWindow | null {
        const referenceSlice = referenceSlices[index];
        if (!referenceSlice) return null;
        const first = Math.max(0, index - 1);
        const last = Math.min(referenceSlices.length, index + 2);
        const windowSlices = referenceSlices.slice(first, last);
        return {
            referenceSlice,
            referenceWindowSliceIds: windowSlices.map((slice) => slice.id),
            normalized: normalizeForMatch(windowSlices.map((slice) => slice.text).join("\n")),
            keyTokens: Array.from(new Set(windowSlices.flatMap((slice) => slice.keyTokens))).sort()
        };
    }

    function scoreMatch(mySlice: ManualSlice, candidate: CandidateWindow): MatchScore {
        if (mySlice.normalized === candidate.referenceSlice.normalized) {
            const tokenDifference = compareTokens(mySlice.keyTokens, candidate.referenceSlice.keyTokens);
            return {
                referenceSliceId: candidate.referenceSlice.id,
                referenceWindowSliceIds: [candidate.referenceSlice.id],
                similarity: 1,
                coverage: 1,
                missingTokens: tokenDifference.missing,
                extraTokens: tokenDifference.extra,
                exact: true
            };
        }

        const myGrams = grams(mySlice.normalized);
        const candidateGrams = grams(candidate.normalized);
        const centerGrams = grams(candidate.referenceSlice.normalized);
        const candidateSet = new Set(candidateGrams);
        const centerSet = new Set(centerGrams);
        const mySet = new Set(myGrams);
        const overlap = myGrams.filter((gram) => candidateSet.has(gram)).length;
        const centerOverlap = myGrams.filter((gram) => centerSet.has(gram)).length;
        const reverseOverlap = candidateGrams.filter((gram) => mySet.has(gram)).length;
        const coverage = myGrams.length ? overlap / myGrams.length : 0;
        const centerCoverage = myGrams.length ? centerOverlap / myGrams.length : 0;
        const reverseCoverage = candidateGrams.length ? reverseOverlap / candidateGrams.length : 0;
        const dice = myGrams.length + candidateGrams.length
            ? (2 * overlap) / (myGrams.length + candidateGrams.length)
            : 0;
        const tokenDifference = compareTokens(mySlice.keyTokens, candidate.referenceSlice.keyTokens);
        const tokenRatio = tokenDifference.shared / Math.max(mySlice.keyTokens.length, candidate.referenceSlice.keyTokens.length, 1);
        const containsBoost = candidate.normalized.includes(mySlice.normalized) || mySlice.normalized.includes(candidate.normalized) ? 0.08 : 0;
        const centerPenalty = centerCoverage < 0.28 ? 0.25 : 0;
        const similarity = clamp(dice * 0.62 + coverage * 0.28 + tokenRatio * 0.1 + containsBoost - centerPenalty);
        return {
            referenceSliceId: candidate.referenceSlice.id,
            referenceWindowSliceIds: candidate.referenceWindowSliceIds,
            similarity,
            coverage,
            missingTokens: tokenDifference.missing,
            extraTokens: tokenDifference.extra,
            exact: false
        };
    }

    function compareTokens(myTokens: string[], referenceTokens: string[]): { missing: string[]; extra: string[]; shared: number } {
        const mySet = new Set(myTokens);
        const referenceSet = new Set(referenceTokens);
        return {
            missing: Array.from(mySet).filter((token) => !referenceSet.has(token)),
            extra: Array.from(referenceSet).filter((token) => !mySet.has(token)),
            shared: Array.from(mySet).filter((token) => referenceSet.has(token)).length
        };
    }

    function findReferenceMatch(mySlice: ManualSlice, lookup: ReferenceLookup, referenceSlices: ManualSlice[]): MatchScore | null {
        const candidates = candidateIndexes(mySlice, lookup, referenceSlices)
            .map((index) => makeReferenceWindow(index, referenceSlices))
            .filter((candidate): candidate is CandidateWindow => !!candidate)
            .map((candidate) => scoreMatch(mySlice, candidate))
            .sort((left, right) => right.similarity - left.similarity
                || right.coverage - left.coverage
                || left.referenceSliceId.localeCompare(right.referenceSliceId));
        return candidates[0] || null;
    }

    function classifyMyResult(mySlice: ManualSlice, match: MatchScore | null, resultIndex: number): MyManualResult {
        if (!match || (match.similarity < 0.42 && match.coverage < 0.52
            && !((match.missingTokens.length || match.extraTokens.length) && (match.similarity >= 0.32 || match.coverage >= 0.35)))) {
            return {
                id: `my-result-${resultIndex + 1}`,
                kind: "reference-missing",
                mySliceId: mySlice.id,
                similarity: 0,
                coverage: 0,
                missingTokens: mySlice.keyTokens,
                extraTokens: [],
                reason: "参考手册中未找到可靠对应。"
            };
        }
        const hasKeyDifference = match.missingTokens.length > 0 || match.extraTokens.length > 0;
        const kind: MyManualResult["kind"] = match.exact && !hasKeyDifference
            ? "same"
            : hasKeyDifference || match.similarity >= 0.58 || match.coverage >= 0.66
                ? "micro"
                : "review";
        return {
            id: `my-result-${resultIndex + 1}`,
            kind,
            mySliceId: mySlice.id,
            referenceMatch: {
                referenceSliceId: match.referenceSliceId,
                referenceWindowSliceIds: match.referenceWindowSliceIds,
                similarity: round(match.similarity),
                coverage: round(match.coverage),
                missingTokens: match.missingTokens,
                extraTokens: match.extraTokens
            },
            similarity: round(match.similarity),
            coverage: round(match.coverage),
            missingTokens: match.missingTokens,
            extraTokens: match.extraTokens,
            reason: reasonFor(kind, hasKeyDifference)
        };
    }

    function reasonFor(kind: DifferenceKind, hasKeyDifference = false): string {
        if (kind === "same") return "找到可靠一致内容。";
        if (kind === "micro" && hasKeyDifference) return "相似内容存在数字、英文或条款号变化。";
        if (kind === "micro") return "找到相似内容，文字存在变化。";
        if (kind === "review") return "找到弱候选，需要人工确认。";
        if (kind === "my-missing") return "我的手册中未找到可靠对应。";
        return "参考手册中未找到可靠对应。";
    }

    function makeStructuralBlocks(
        kind: StructuralDifferenceBlock["kind"],
        sliceIds: string[],
        slices: ManualSlice[]
    ): StructuralDifferenceBlock[] {
        const byId = new Map(slices.map((slice) => [slice.id, slice]));
        const ordered = sliceIds
            .map((id) => byId.get(id))
            .filter((slice): slice is ManualSlice => !!slice)
            .sort((left, right) => left.sliceIndex - right.sliceIndex);
        const groups: ManualSlice[][] = [];
        ordered.forEach((slice) => {
            const group = groups[groups.length - 1];
            const previous = group?.[group.length - 1];
            const contiguous = !!previous && slice.sliceIndex === previous.sliceIndex + 1;
            const nearbyPdfContent = !!previous
                && previous.pageNumber !== undefined
                && previous.pageNumber === slice.pageNumber
                && slice.sliceIndex - previous.sliceIndex <= 8;
            if (contiguous || nearbyPdfContent) {
                group.push(slice);
                return;
            }
            groups.push([slice]);
        });
        return groups.map((group, index) => {
            const first = group[0];
            const last = group[group.length - 1];
            return {
                id: `${kind}-block-${index + 1}`,
                kind,
                sliceIds: group.map((slice) => slice.id),
                location: `${sliceLocation(first)}${group.length > 1 ? ` ~ ${sliceLocation(last)}` : ""}`,
                title: first.title
            };
        });
    }

    function compare(myManual: WorkerManual, referenceManual: WorkerManual, options: ComparisonOptions = {}, reportProgress?: (progress: ComparisonProgress) => void): ManualComparison {
        reportProgress?.({ phase: "正在按标点切片", completed: 0, total: 1 });
        const mySlices = createSlices(myManual, options);
        const referenceSlices = createSlices(referenceManual, options);
        reportProgress?.({ phase: "正在建立参考手册索引", completed: 1, total: 1 });
        const referenceLookup = buildReferenceLookup(referenceSlices);
        const myResults: MyManualResult[] = [];

        mySlices.forEach((mySlice, index) => {
            myResults.push(classifyMyResult(mySlice, findReferenceMatch(mySlice, referenceLookup, referenceSlices), index));
            if (index % 120 === 0 || index + 1 === mySlices.length) {
                reportProgress?.({ phase: "正在核对我的手册", completed: index + 1, total: mySlices.length });
            }
        });

        reportProgress?.({ phase: "正在建立我的手册索引", completed: 1, total: 1 });
        const myLookup = buildReferenceLookup(mySlices);
        const referenceMissingResults: ReferenceMissingResult[] = [];
        referenceSlices.forEach((referenceSlice, index) => {
            const myMatch = findReferenceMatch(referenceSlice, myLookup, mySlices);
            const reliable = !!myMatch && (myMatch.similarity >= 0.42 || myMatch.coverage >= 0.52
                || ((myMatch.missingTokens.length || myMatch.extraTokens.length) && (myMatch.similarity >= 0.32 || myMatch.coverage >= 0.35)));
            if (!reliable) {
                referenceMissingResults.push({
                    id: `reference-missing-${referenceMissingResults.length + 1}`,
                    kind: "my-missing",
                    referenceSliceId: referenceSlice.id,
                    reason: reasonFor("my-missing")
                });
            }
            if (index % 120 === 0 || index + 1 === referenceSlices.length) {
                reportProgress?.({ phase: "正在识别我的手册缺失内容", completed: index + 1, total: referenceSlices.length });
            }
        });

        const myMissingBlocks = makeStructuralBlocks("my-missing", referenceMissingResults.map((result) => result.referenceSliceId), referenceSlices);
        const referenceMissingBlocks = makeStructuralBlocks(
            "reference-missing",
            myResults.filter((result) => result.kind === "reference-missing").map((result) => result.mySliceId),
            mySlices
        );
        const conflictResultIds = myResults
            .filter((result) => result.kind === "micro" && (result.missingTokens.length || result.extraTokens.length))
            .map((result) => result.id);
        const compared = myResults.filter((result) => result.kind !== "reference-missing");
        const mySliceById = new Map(mySlices.map((slice) => [slice.id, slice]));
        const coveredWeight = compared.reduce((total, result) => {
            const slice = mySliceById.get(result.mySliceId);
            return total + (slice?.weight || 0) * Math.max(result.similarity, result.coverage);
        }, 0);
        const totalWeight = mySlices.reduce((total, slice) => total + slice.weight, 0);
        const averageSimilarity = myResults.length
            ? myResults.reduce((total, result) => total + result.similarity, 0) / myResults.length
            : 0;

        return {
            mySlices,
            referenceSlices,
            myResults,
            referenceMissingResults,
            myMissingBlocks,
            referenceMissingBlocks,
            conflictResultIds,
            summary: {
                myManualName: myManual.name,
                referenceManualName: referenceManual.name,
                mySliceCount: mySlices.length,
                referenceSliceCount: referenceSlices.length,
                sameCount: myResults.filter((result) => result.kind === "same").length,
                microCount: myResults.filter((result) => result.kind === "micro").length,
                reviewCount: myResults.filter((result) => result.kind === "review").length,
                myMissingBlockCount: myMissingBlocks.length,
                referenceMissingBlockCount: referenceMissingBlocks.length,
                conflictCount: conflictResultIds.length,
                myCoverageRate: round(totalWeight ? coveredWeight / totalWeight : 0),
                averageSimilarity: round(averageSimilarity)
            }
        };
    }

    function sliceLocation(slice: ManualSlice): string {
        return slice.pageNumber
            ? `第 ${slice.pageNumber} 页 / 片段 ${slice.sliceIndex}`
            : `第 ${slice.unitIndex} 段 / 片段 ${slice.sliceIndex}`;
    }

    function round(value: number): number {
        return Math.round(clamp(value) * 1000) / 1000;
    }

    function clamp(value: number): number {
        return Math.max(0, Math.min(1, value));
    }

    (globalThis as any).ManualProofCore = {
        compare,
        createSlices,
        normalizeForMatch,
        extractKeyTokens,
        splitLongText,
        sliceLocation
    };
})();
