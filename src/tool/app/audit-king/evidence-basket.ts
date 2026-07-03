(function () {
    const runtime = window.AuditKing || (window.AuditKing = {});

    const headers = ["条款名称", "依据序号", "依据内容", "备注"];

    function buildEvidenceRows(groups: AuditKingEvidenceGroup[]): Array<Array<string | number>> {
        return [
            headers,
            ...groups.flatMap((group) => {
                if (!group.items.length) {
                    return [[group.title, 0, "", ""]];
                }
                return group.items.map((item, index) => [
                    group.title,
                    index + 1,
                    item.content,
                    item.note
                ]);
            })
        ];
    }

    runtime.EvidenceBasket = {
        headers,
        buildEvidenceRows
    };
})();
