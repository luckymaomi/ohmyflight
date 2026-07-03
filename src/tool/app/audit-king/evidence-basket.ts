(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    const headers = ["关键词", "依据名称", "检查单条款", "手册", "位置", "手册原文摘录", "备注"];

    function buildEvidenceRows(items: AuditKingEvidenceItem[]): string[][] {
        return [
            headers,
            ...items.map((item) => [
                item.keywordText,
                item.title,
                item.checklistClause,
                item.documentName,
                item.locationLabel,
                item.excerpt,
                item.note
            ])
        ];
    }

    runtime.EvidenceBasket = {
        headers,
        buildEvidenceRows
    };
})();
