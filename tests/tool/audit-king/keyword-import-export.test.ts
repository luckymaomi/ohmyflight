import * as XLSX from "xlsx-js-style";
import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("audit-king keyword import export", () => {
  let keywordIO: any;

  beforeAll(() => {
    const context = loadBrowserScripts(["tool/app/audit-king/keyword-import-export.js"], { XLSX });
    keywordIO = (context.AuditKing as any).KeywordImportExport;
  });

  it("builds a keyword workbook with source location fields", () => {
    const workbook = keywordIO.buildKeywordWorkbook([
      {
        id: "kw-1",
        text: "进入条件",
        color: "#f59e0b",
        enabled: true,
        source: {
          blockId: "checklist-b1",
          start: 10,
          end: 14
        }
      }
    ]);

    const sheet = workbook.Sheets["关键词"];

    expect(sheet.A1?.v).toBe("关键词");
    expect(sheet.B1?.v).toBe("启用");
    expect(sheet.C1?.v).toBe("颜色");
    expect(sheet.D1?.v).toBe("检查单段落");
    expect(sheet.E1?.v).toBe("来源起点");
    expect(sheet.F1?.v).toBe("来源终点");
    expect(sheet.A2?.v).toBe("进入条件");
    expect(sheet.B2?.v).toBe("是");
    expect(sheet.C2?.v).toBe("#f59e0b");
    expect(sheet.D2?.v).toBe("checklist-b1");
    expect(sheet.E2?.v).toBe(10);
    expect(sheet.F2?.v).toBe(14);
  });

  it("reads keywords from a workbook by header names", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["颜色", "来源终点", "关键词", "检查单段落", "启用", "来源起点"],
      ["#22c55e", 18, "训练要求", "checklist-b2", "否", 12],
      ["#3b82f6", "", "证件", "", "是", ""],
      ["#ef4444", "", "", "", "是", ""]
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
          start: 12,
          end: 18
        }
      },
      {
        text: "证件",
        color: "#3b82f6",
        enabled: true
      }
    ]);
  });
});
