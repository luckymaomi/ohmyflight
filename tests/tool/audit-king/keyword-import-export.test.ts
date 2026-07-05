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
        label: "1.1 训练资格",
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
        },
        evidences: [
          {
            id: "manual-evidence-1",
            sourceType: "selection",
            documentId: "manual-1",
            documentName: "运行手册.docx",
            blockId: "manual-1-b3",
            blockIndex: 3,
            title: "训练章节",
            start: 10,
            end: 14,
            globalStart: 210,
            globalEnd: 214,
            text: "进入条件",
            beforeText: "机组",
            afterText: "应当",
            mode: "exact",
            note: "已人工确认"
          }
        ]
      }
    ]);

    const sheet = workbook.Sheets["关键词"];
    const evidenceSheet = workbook.Sheets["手册证据"];

    expect(sheet.A1?.v).toBe("序号");
    expect(sheet.B1?.v).toBe("关键词");
    expect(sheet.C1?.v).toBe("标记");
    expect(sheet.D1?.v).toBe("启用");
    expect(sheet.E1?.v).toBe("颜色");
    expect(sheet.F1?.v).toBe("检查单段落");
    expect(sheet.G1?.v).toBe("检查单段落序号");
    expect(sheet.H1?.v).toBe("来源起点");
    expect(sheet.I1?.v).toBe("来源终点");
    expect(sheet.J1?.v).toBe("来源文本");
    expect(sheet.K1?.v).toBe("来源前文");
    expect(sheet.L1?.v).toBe("来源后文");
    expect(sheet.A2?.v).toBe(1);
    expect(sheet.B2?.v).toBe("进入条件");
    expect(sheet.C2?.v).toBe("1.1 训练资格");
    expect(sheet.D2?.v).toBe("是");
    expect(sheet.E2?.v).toBe("#f59e0b");
    expect(sheet.F2?.v).toBe("checklist-b1");
    expect(sheet.G2?.v).toBe(1);
    expect(sheet.H2?.v).toBe(10);
    expect(sheet.I2?.v).toBe(14);
    expect(sheet.J2?.v).toBe("进入条件");
    expect(sheet.K2?.v).toBe("训练要求");
    expect(sheet.L2?.v).toBe("资格检查");
    expect(workbook.SheetNames).toEqual(["关键词", "手册证据"]);
    expect(evidenceSheet.A1?.v).toBe("关键词序号");
    expect(evidenceSheet.B1?.v).toBe("关键词");
    expect(evidenceSheet.C1?.v).toBe("证据序号");
    expect(evidenceSheet.D1?.v).toBe("证据来源");
    expect(evidenceSheet.E1?.v).toBe("手册名称");
    expect(evidenceSheet.F1?.v).toBe("手册ID");
    expect(evidenceSheet.G1?.v).toBe("手册段落");
    expect(evidenceSheet.H1?.v).toBe("手册段落序号");
    expect(evidenceSheet.I1?.v).toBe("章节标题");
    expect(evidenceSheet.J1?.v).toBe("证据起点");
    expect(evidenceSheet.K1?.v).toBe("证据终点");
    expect(evidenceSheet.L1?.v).toBe("全文起点");
    expect(evidenceSheet.M1?.v).toBe("全文终点");
    expect(evidenceSheet.N1?.v).toBe("证据文本");
    expect(evidenceSheet.O1?.v).toBe("证据前文");
    expect(evidenceSheet.P1?.v).toBe("证据后文");
    expect(evidenceSheet.Q1?.v).toBe("命中类型");
    expect(evidenceSheet.R1?.v).toBe("备注");
    expect(evidenceSheet.A2?.v).toBe(1);
    expect(evidenceSheet.B2?.v).toBe("进入条件");
    expect(evidenceSheet.C2?.v).toBe(1);
    expect(evidenceSheet.D2?.v).toBe("selection");
    expect(evidenceSheet.E2?.v).toBe("运行手册.docx");
    expect(evidenceSheet.F2?.v).toBe("manual-1");
    expect(evidenceSheet.G2?.v).toBe("manual-1-b3");
    expect(evidenceSheet.H2?.v).toBe(3);
    expect(evidenceSheet.I2?.v).toBe("训练章节");
    expect(evidenceSheet.J2?.v).toBe(10);
    expect(evidenceSheet.K2?.v).toBe(14);
    expect(evidenceSheet.L2?.v).toBe(210);
    expect(evidenceSheet.M2?.v).toBe(214);
    expect(evidenceSheet.N2?.v).toBe("进入条件");
    expect(evidenceSheet.O2?.v).toBe("机组");
    expect(evidenceSheet.P2?.v).toBe("应当");
    expect(evidenceSheet.Q2?.v).toBe("exact");
    expect(evidenceSheet.R2?.v).toBe("已人工确认");
  });

  it("reads keywords from a workbook by header names", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["颜色", "来源终点", "关键词", "检查单段落", "启用", "来源起点", "检查单段落序号", "来源文本", "来源前文", "来源后文", "序号"],
      ["#22c55e", 18, "训练要求", "checklist-b2", "否", 12, 2, "训练要求", "进入条件", "资格检查", 2],
      ["#64748b", "", "无效序号", "", "是", "", "", "", "", "", 0],
      ["#3b82f6", "", "证件", "", "是", "", "", "", "", "", ""],
      ["#ef4444", "", "", "", "是", "", "", "", "", "", 1],
      ["#f59e0b", "", "进入条件", "", "是", "", "", "", "", "", 1]
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "关键词");

    const keywords = keywordIO.parseKeywordWorkbook(workbook);

    expect(keywords).toEqual([
      {
        text: "进入条件",
        order: 1,
        color: "#f59e0b",
        enabled: true
      },
      {
        text: "训练要求",
        order: 2,
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
        text: "无效序号",
        color: "#64748b",
        enabled: true
      },
      {
        text: "证件",
        color: "#3b82f6",
        enabled: true
      }
    ]);
  });

  it("reads keyword labels from a workbook by header names", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["关键词", "标记", "启用", "颜色"],
      ["进入机长训练", "1.1 机组资格", "是", "#f59e0b"]
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "关键词");

    const keywords = keywordIO.parseKeywordWorkbook(workbook);

    expect(keywords).toEqual([
      {
        text: "进入机长训练",
        label: "1.1 机组资格",
        color: "#f59e0b",
        enabled: true
      }
    ]);
  });

  it("reads manual evidences from the second sheet and attaches them to the matching keyword row", () => {
    const keywordSheet = XLSX.utils.aoa_to_sheet([
      ["序号", "关键词", "标记", "启用", "颜色"],
      [1, "进入条件", "1.1 训练资格", "是", "#f59e0b"],
      [2, "训练要求", "1.2 训练要求", "是", "#22c55e"]
    ]);
    const evidenceSheet = XLSX.utils.aoa_to_sheet([
      ["关键词序号", "关键词", "证据序号", "证据来源", "手册名称", "手册ID", "手册段落", "手册段落序号", "章节标题", "证据起点", "证据终点", "全文起点", "全文终点", "证据文本", "证据前文", "证据后文", "命中类型", "备注"],
      [1, "进入条件", 1, "summary", "运行手册.docx", "manual-1", "manual-1-b3", 3, "训练章节", 10, 14, 210, 214, "进入条件", "机组", "应当", "exact", "已人工确认"],
      [1, "进入条件", 2, "selection", "训练大纲.docx", "manual-2", "manual-2-b8", 8, "", 4, 8, 304, 308, "进入条件", "进入", "检查", "loose", ""]
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, keywordSheet, "关键词");
    XLSX.utils.book_append_sheet(workbook, evidenceSheet, "手册证据");

    const keywords = keywordIO.parseKeywordWorkbook(workbook);

    expect(keywords[0].evidences).toEqual([
      {
        sourceType: "summary",
        documentName: "运行手册.docx",
        documentId: "manual-1",
        blockId: "manual-1-b3",
        blockIndex: 3,
        title: "训练章节",
        start: 10,
        end: 14,
        globalStart: 210,
        globalEnd: 214,
        text: "进入条件",
        beforeText: "机组",
        afterText: "应当",
        mode: "exact",
        note: "已人工确认"
      },
      {
        sourceType: "selection",
        documentName: "训练大纲.docx",
        documentId: "manual-2",
        blockId: "manual-2-b8",
        blockIndex: 8,
        title: "",
        start: 4,
        end: 8,
        globalStart: 304,
        globalEnd: 308,
        text: "进入条件",
        beforeText: "进入",
        afterText: "检查",
        mode: "loose",
        note: ""
      }
    ]);
    expect(keywords[1].evidences).toEqual([]);
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
