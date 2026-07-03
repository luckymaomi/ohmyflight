import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("audit-king keyword import export", () => {
  let keywordIO: any;

  beforeAll(() => {
    const context = loadBrowserScripts([
      "tool/app/audit-king/source-locator.js",
      "tool/app/audit-king/keyword-import-export.js"
    ], { XLSX });
    keywordIO = (context.AuditKing as any).KeywordImportExport;
  });

  it("builds a keyword workbook with durable source location fields", () => {
    const workbook = keywordIO.buildKeywordWorkbook([
      {
        id: "kw-1",
        text: "进入条件",
        color: "#f59e0b",
        enabled: true,
        source: {
          blockId: "checklist-b1",
          blockIndex: 1,
          start: 10,
          end: 14,
          text: "进入条件",
          beforeText: "训练要求",
          afterText: "资格检查"
        }
      }
    ]);

    const sheet = workbook.Sheets["关键词"];

    expect(sheet.A1?.v).toBe("关键词");
    expect(sheet.B1?.v).toBe("启用");
    expect(sheet.C1?.v).toBe("颜色");
    expect(sheet.D1?.v).toBe("检查单段落");
    expect(sheet.E1?.v).toBe("检查单段落序号");
    expect(sheet.F1?.v).toBe("来源起点");
    expect(sheet.G1?.v).toBe("来源终点");
    expect(sheet.H1?.v).toBe("来源文本");
    expect(sheet.I1?.v).toBe("来源前文");
    expect(sheet.J1?.v).toBe("来源后文");
    expect(sheet.A2?.v).toBe("进入条件");
    expect(sheet.B2?.v).toBe("是");
    expect(sheet.C2?.v).toBe("#f59e0b");
    expect(sheet.D2?.v).toBe("checklist-b1");
    expect(sheet.E2?.v).toBe(1);
    expect(sheet.F2?.v).toBe(10);
    expect(sheet.G2?.v).toBe(14);
    expect(sheet.H2?.v).toBe("进入条件");
    expect(sheet.I2?.v).toBe("训练要求");
    expect(sheet.J2?.v).toBe("资格检查");
  });

  it("reads keywords from a workbook by header names", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["颜色", "来源终点", "关键词", "检查单段落", "启用", "来源起点", "检查单段落序号", "来源文本", "来源前文", "来源后文"],
      ["#22c55e", 18, "训练要求", "checklist-b2", "否", 12, 2, "训练要求", "进入条件", "资格检查"],
      ["#3b82f6", "", "证件", "", "是", "", "", "", "", ""],
      ["#ef4444", "", "", "", "是", "", "", "", "", ""]
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "关键词");

    const keywords = keywordIO.parseKeywordWorkbook(workbook);

    expect(keywords).toEqual([
      {
        text: "训练要求",
        color: "#22c55e",
        enabled: false,
        source: {
          blockId: "checklist-b2",
          blockIndex: 2,
          start: 12,
          end: 18,
          text: "训练要求",
          beforeText: "进入条件",
          afterText: "资格检查"
        }
      },
      {
        text: "证件",
        color: "#3b82f6",
        enabled: true
      }
    ]);
  });

  it("reads legacy timestamp source ids and derives the stable block index", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["关键词", "启用", "颜色", "检查单段落", "来源起点", "来源终点"],
      ["进入机长训练", "是", "#f59e0b", "doc-1-1783044084949-checklist-docx-b38", 12, 18]
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "关键词");

    const keywords = keywordIO.parseKeywordWorkbook(workbook);

    expect(keywords[0].source).toEqual({
      blockId: "doc-1-1783044084949-checklist-docx-b38",
      blockIndex: 38,
      start: 12,
      end: 18
    });
  });
});
