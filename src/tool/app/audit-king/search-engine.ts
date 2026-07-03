(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    function requireNormalizer() {
        if (!runtime.TextNormalizer) {
            throw new Error("AuditKing.TextNormalizer is not loaded.");
        }
        return runtime.TextNormalizer;
    }

    const GRAM_SIZE = 2;

    function createCounts(keywords: AuditKingKeyword[]): Record<string, number> {
        const counts: Record<string, number> = {};
        keywords.forEach((keyword) => {
            counts[keyword.id] = 0;
        });
        return counts;
    }

    function uniqueNumbers(values: number[]): number[] {
        return Array.from(new Set(values)).sort((left, right) => left - right);
    }

    function createFlexIndex(): any {
        const IndexCtor = window.FlexSearch?.Index;
        if (!IndexCtor) {
            return null;
        }
        return new IndexCtor({
            tokenize: "full",
            cache: false
        });
    }

    function gramsFor(text: string): string[] {
        if (!text) return [];
        if (text.length <= GRAM_SIZE) return [text];
        const grams: string[] = [];
        for (let index = 0; index <= text.length - GRAM_SIZE; index += 1) {
            grams.push(text.slice(index, index + GRAM_SIZE));
        }
        return Array.from(new Set(grams));
    }

    function intersectSorted(left: number[], right: number[]): number[] {
        const result: number[] = [];
        let leftIndex = 0;
        let rightIndex = 0;
        while (leftIndex < left.length && rightIndex < right.length) {
            const leftValue = left[leftIndex];
            const rightValue = right[rightIndex];
            if (leftValue === rightValue) {
                result.push(leftValue);
                leftIndex += 1;
                rightIndex += 1;
            } else if (leftValue < rightValue) {
                leftIndex += 1;
            } else {
                rightIndex += 1;
            }
        }
        return result;
    }

    function buildDocumentIndex(documents: AuditKingDocument[]): AuditKingDocumentIndex {
        const normalizer = requireNormalizer();
        const blocks: AuditKingIndexedBlock[] = [];
        const grams: Record<string, number[]> = {};
        const flexIndex = createFlexIndex();

        documents.forEach((documentItem) => {
            documentItem.blocks.forEach((block) => {
                const loose = normalizer.buildLooseIndex(block.text);
                const indexedBlock: AuditKingIndexedBlock = {
                    ...block,
                    looseText: loose.normalized,
                    looseOffsetMap: loose.offsetMap
                };
                const blockIndex = blocks.length;
                blocks.push(indexedBlock);
                flexIndex?.add(blockIndex, indexedBlock.looseText);
                gramsFor(indexedBlock.looseText).forEach((gram) => {
                    if (!grams[gram]) {
                        grams[gram] = [];
                    }
                    grams[gram].push(blockIndex);
                });
            });
        });

        Object.keys(grams).forEach((gram) => {
            grams[gram] = uniqueNumbers(grams[gram]);
        });

        return {
            documents,
            blocks,
            grams,
            flexIndex
        };
    }

    function makeMatch(
        keyword: AuditKingKeyword,
        block: AuditKingTextBlock,
        start: number,
        end: number,
        mode: "exact" | "loose",
        serial: number
    ): AuditKingMatch {
        return {
            id: `${keyword.id}-${block.id}-${start}-${end}-${mode}-${serial}`,
            keywordId: keyword.id,
            keywordText: keyword.text,
            keywordColor: keyword.color,
            documentId: block.documentId,
            documentName: block.documentName,
            blockId: block.id,
            blockIndex: block.blockIndex,
            title: block.title,
            start,
            end,
            mode,
            matchedText: block.text.slice(start, end),
            blockText: block.text
        };
    }

    function exactMatches(keyword: AuditKingKeyword, block: AuditKingIndexedBlock, serialRef: { value: number }): AuditKingMatch[] {
        const matches: AuditKingMatch[] = [];
        if (!keyword.text) return matches;

        let start = block.text.indexOf(keyword.text);
        while (start >= 0) {
            const end = start + keyword.text.length;
            matches.push(makeMatch(keyword, block, start, end, "exact", serialRef.value++));
            start = block.text.indexOf(keyword.text, start + Math.max(1, keyword.text.length));
        }
        return matches;
    }

    function looseMatches(
        keyword: AuditKingKeyword,
        block: AuditKingIndexedBlock,
        existingRanges: Set<string>,
        serialRef: { value: number }
    ): AuditKingMatch[] {
        const normalizer = requireNormalizer();
        const matches: AuditKingMatch[] = [];
        const keywordIndex = normalizer.buildLooseIndex(keyword.text);
        const keywordText = keywordIndex.normalized;
        if (!keywordText) return matches;

        let normalizedStart = block.looseText.indexOf(keywordText);
        while (normalizedStart >= 0) {
            const normalizedEnd = normalizedStart + keywordText.length - 1;
            const start = block.looseOffsetMap[normalizedStart]?.originalStart;
            const end = block.looseOffsetMap[normalizedEnd]?.originalEnd;
            if (typeof start === "number" && typeof end === "number") {
                const rangeKey = `${start}:${end}`;
                if (!existingRanges.has(rangeKey)) {
                    matches.push(makeMatch(keyword, block, start, end, "loose", serialRef.value++));
                    existingRanges.add(rangeKey);
                }
            }
            normalizedStart = block.looseText.indexOf(keywordText, normalizedStart + Math.max(1, keywordText.length));
        }
        return matches;
    }

    function ngramCandidateBlockIndexes(index: AuditKingDocumentIndex, normalized: string): number[] {
        const queryGrams = gramsFor(normalized)
            .filter((gram) => index.grams[gram]?.length);
        if (!queryGrams.length) {
            return index.blocks.map((_, blockIndex) => blockIndex);
        }

        queryGrams.sort((left, right) => index.grams[left].length - index.grams[right].length);
        let candidates = [...index.grams[queryGrams[0]]];
        for (let gramIndex = 1; gramIndex < queryGrams.length; gramIndex += 1) {
            candidates = intersectSorted(candidates, index.grams[queryGrams[gramIndex]]);
            if (!candidates.length) break;
        }
        return candidates;
    }

    function flexCandidateBlockIndexes(index: AuditKingDocumentIndex, normalized: string): number[] {
        if (!index.flexIndex || !normalized) {
            return [];
        }
        const result = index.flexIndex.search(normalized, index.blocks.length);
        return Array.isArray(result) ? result.map(Number).filter(Number.isInteger) : [];
    }

    function candidateBlockIndexes(index: AuditKingDocumentIndex, keyword: AuditKingKeyword): number[] {
        const normalizer = requireNormalizer();
        const normalized = normalizer.normalizeLoose(keyword.text);
        const flexCandidates = flexCandidateBlockIndexes(index, normalized);
        const ngramCandidates = ngramCandidateBlockIndexes(index, normalized);
        return uniqueNumbers([...flexCandidates, ...ngramCandidates]);
    }

    function searchIndex(index: AuditKingDocumentIndex, keywords: AuditKingKeyword[]): AuditKingSearchResult {
        const enabledKeywords = keywords.filter((keyword) => keyword.enabled !== false && keyword.text.trim());
        const countsByKeyword = createCounts(keywords);
        const matches: AuditKingMatch[] = [];
        const serialRef = { value: 1 };

        enabledKeywords.forEach((keyword) => {
            candidateBlockIndexes(index, keyword).forEach((blockIndex) => {
                const block = index.blocks[blockIndex];
                const blockMatches: AuditKingMatch[] = [];
                const exact = exactMatches(keyword, block, serialRef);
                const ranges = new Set(exact.map((match) => `${match.start}:${match.end}`));
                blockMatches.push(...exact);
                blockMatches.push(...looseMatches(keyword, block, ranges, serialRef));
                countsByKeyword[keyword.id] += blockMatches.length;
                matches.push(...blockMatches);
            });
        });

        matches.sort((left, right) => {
            if (left.documentName !== right.documentName) {
                return left.documentName.localeCompare(right.documentName, "zh-Hans-CN");
            }
            if (left.blockIndex !== right.blockIndex) {
                return left.blockIndex - right.blockIndex;
            }
            return left.start - right.start;
        });

        return { matches, countsByKeyword };
    }

    function searchDocuments(documents: AuditKingDocument[], keywords: AuditKingKeyword[]): AuditKingSearchResult {
        return searchIndex(buildDocumentIndex(documents), keywords);
    }

    function filterMatches(matches: AuditKingMatch[], filters: { keywordId: string; documentId: string }): AuditKingMatch[] {
        return matches.filter((match) => {
            const keywordOk = !filters.keywordId || filters.keywordId === "all" || match.keywordId === filters.keywordId;
            const documentOk = !filters.documentId || filters.documentId === "all" || match.documentId === filters.documentId;
            return keywordOk && documentOk;
        });
    }

    runtime.SearchEngine = {
        buildDocumentIndex,
        searchIndex,
        searchDocuments,
        filterMatches
    };
})();
