type PdfStampRuleMode = 'all' | 'odd' | 'even' | 'range';

type PdfStampRule = {
    id: number;
    mode: PdfStampRuleMode;
    rangeStr: string;
    xMm: number;
    yMm: number;
    wMm: number;
    hMm: number;
    opacity: number;
    lockRatio: boolean;
};

type PdfStampDrawOptions = {
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
};

type PdfStampLogicApi = {
    MM2PT: number;
    createRule: (id: number, imgAspect: number, overrides?: Partial<PdfStampRule>) => PdfStampRule;
    parsePageRange: (rangeStr: string, maxPage: number) => number[];
    ruleMatchesPage: (rule: Pick<PdfStampRule, 'mode' | 'rangeStr'>, pageNum: number, maxPage: number) => boolean;
    getRulesForPage: (rules: PdfStampRule[], pageNum: number, maxPage: number) => PdfStampRule[];
    buildStampDrawOptions: (rule: PdfStampRule, pageHeightPt: number) => PdfStampDrawOptions;
};

(function () {
    const MM2PT = 72 / 25.4;

    function createRule(id: number, imgAspect: number, overrides?: Partial<PdfStampRule>): PdfStampRule {
        const safeAspect = imgAspect > 0 ? imgAspect : 1;
        return {
            id,
            mode: 'all',
            rangeStr: '',
            xMm: 10,
            yMm: 10,
            wMm: 30,
            hMm: Math.round(30 / safeAspect * 10) / 10,
            opacity: 1,
            lockRatio: true,
            ...(overrides || {})
        };
    }

    function parsePageRange(rangeStr: string, maxPage: number): number[] {
        const max = Math.max(0, Math.floor(maxPage));
        if (!rangeStr || !rangeStr.trim() || max <= 0) return [];

        const pages = new Set<number>();
        for (const part of rangeStr.split(',')) {
            const text = part.trim();
            if (!text) continue;

            if (text.includes('-')) {
                const [startRaw, endRaw] = text.split('-');
                const start = Number.parseInt(startRaw.trim(), 10);
                const end = Number.parseInt(endRaw.trim(), 10);
                if (Number.isNaN(start) || Number.isNaN(end)) continue;

                const lower = Math.max(1, Math.min(start, end));
                const upper = Math.min(max, Math.max(start, end));
                for (let page = lower; page <= upper; page++) {
                    pages.add(page);
                }
                continue;
            }

            const page = Number.parseInt(text, 10);
            if (!Number.isNaN(page) && page >= 1 && page <= max) {
                pages.add(page);
            }
        }

        return Array.from(pages).sort((left, right) => left - right);
    }

    function ruleMatchesPage(rule: Pick<PdfStampRule, 'mode' | 'rangeStr'>, pageNum: number, maxPage: number): boolean {
        if (pageNum < 1 || pageNum > maxPage) return false;
        if (rule.mode === 'all') return true;
        if (rule.mode === 'odd') return pageNum % 2 === 1;
        if (rule.mode === 'even') return pageNum % 2 === 0;
        if (rule.mode === 'range') return parsePageRange(rule.rangeStr, maxPage).includes(pageNum);
        return false;
    }

    function getRulesForPage(rules: PdfStampRule[], pageNum: number, maxPage: number): PdfStampRule[] {
        return rules.filter(rule => ruleMatchesPage(rule, pageNum, maxPage));
    }

    function buildStampDrawOptions(rule: PdfStampRule, pageHeightPt: number): PdfStampDrawOptions {
        const width = rule.wMm * MM2PT;
        const height = rule.hMm * MM2PT;
        return {
            x: rule.xMm * MM2PT,
            y: pageHeightPt - rule.yMm * MM2PT - height,
            width,
            height,
            opacity: rule.opacity
        };
    }

    const api: PdfStampLogicApi = {
        MM2PT,
        createRule,
        parsePageRange,
        ruleMatchesPage,
        getRulesForPage,
        buildStampDrawOptions
    };

    (globalThis as typeof globalThis & { PdfStampLogic?: PdfStampLogicApi }).PdfStampLogic = api;
})();
