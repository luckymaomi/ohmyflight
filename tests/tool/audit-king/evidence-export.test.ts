import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("audit-king evidence export", () => {
  let exportApi: any;

    beforeAll(() => {
        const context = loadBrowserScripts(["tool/app/audit-king/export.js"], { XLSX });
        exportApi = (context.AuditKing as any).Export;
    });

  it("builds an evidence workbook for manually selected matches", () => {
    const workbook = exportApi.buildEvidenceWorkbook([
      {
        keywordText: "进入条件",
        documentName: "飞行人员训练大纲.docx",
        locationLabel: "第 3 段",
        excerpt: "机长转机型训练进入条件",
        note: "可作为 1.1 候选依据"
      }
    ]);

    expect(workbook.SheetNames).toEqual(["依据篮子"]);
    const sheet = workbook.Sheets["依据篮子"];
    expect(sheet.A1?.v).toBe("关键词");
    expect(sheet.B1?.v).toBe("依据名称");
    expect(sheet.C1?.v).toBe("检查单条款");
    expect(sheet.D1?.v).toBe("手册");
    expect(sheet.E1?.v).toBe("位置");
    expect(sheet.F1?.v).toBe("手册原文摘录");
    expect(sheet.G1?.v).toBe("备注");
    expect(sheet.A2?.v).toBe("进入条件");
    expect(sheet.D2?.v).toBe("飞行人员训练大纲.docx");
    expect(sheet.F2?.v).toBe("机长转机型训练进入条件");
  });

  it("reads evidence rows back from a workbook by header names", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["备注", "手册原文摘录", "关键词", "位置", "依据名称", "手册", "检查单条款"],
      ["可用", "训练进入条件", "进入条件", "第 3 段", "1.1 进入条件", "训练大纲.docx", "检查单 1.1"]
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "依据篮子");

    const rows = exportApi.parseEvidenceWorkbook(workbook);

    expect(rows).toEqual([
      {
        keywordText: "进入条件",
        title: "1.1 进入条件",
        checklistClause: "检查单 1.1",
        documentName: "训练大纲.docx",
        locationLabel: "第 3 段",
        excerpt: "训练进入条件",
        note: "可用"
      }
    ]);
  });
});
