import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("校对之王 Word 报告模型", () => {
    let report: any;

    beforeAll(() => {
        const context = loadBrowserScripts(["tool/app/proof-king/report-model.js"]);
        report = (context as any).ManualProof.ReportModel;
    });

    it("只在报告层从稳定事件标题整理章节编号和红删蓝增", () => {
        const rows = report.buildRows([{
            kind: "modified",
            title: "5.7.2 训练模块和科目",
            reason: "对应内容存在文字变化。",
            myLocation: "第 41 页",
            referenceLocation: "第 47 页",
            myDiff: [{ kind: "equal", text: "第十二课" }, { kind: "removed", text: "飞行技能考试" }],
            referenceDiff: [{ kind: "equal", text: "第十二课" }, { kind: "added", text: "转机型训练实践考试" }]
        }]);

        expect(rows[0]).toMatchObject({ chapter: "第 5 章", number: "5.7.2", title: "5.7.2 训练模块和科目" });
        expect(rows[0].myRuns).toContainEqual({ text: "飞行技能考试", color: "FF0000" });
        expect(rows[0].referenceRuns).toContainEqual({ text: "转机型训练实践考试", color: "00B0F0" });
    });
});
