import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("audit-king source locator", () => {
  let locator: any;

  beforeAll(() => {
    const context = loadBrowserScripts(["tool/app/audit-king/source-locator.js"]);
    locator = (context.AuditKing as any).SourceLocator;
  });

  it("creates a durable checklist source with block index, selected text and context", () => {
    const source = locator.makeSource({
      id: "doc-1-checklist-docx-b7",
      documentId: "doc-1-checklist-docx",
      documentName: "检查单.docx",
      blockIndex: 7,
      title: "",
      text: "程序是否规定进入机长训练并完成检查"
    }, 6, 12);

    expect(source).toMatchObject({
      blockId: "doc-1-checklist-docx-b7",
      blockIndex: 7,
      start: 6,
      end: 12,
      text: "进入机长训练"
    });
    expect(source.beforeText).toBe("程序是否规定");
    expect(source.afterText).toBe("并完成检查");
  });

  it("resolves legacy timestamp block ids by block index and coordinates", () => {
    const blocks = [
      { id: "doc-1-checklist-docx-b1", documentId: "doc-1-checklist-docx", documentName: "检查单.docx", blockIndex: 1, title: "", text: "无关段落" },
      { id: "doc-1-checklist-docx-b2", documentId: "doc-1-checklist-docx", documentName: "检查单.docx", blockIndex: 2, title: "", text: "程序是否规定进入机长训练" }
    ];

    const source = locator.resolveSource({
      blockId: "doc-1-1783044084949-checklist-docx-b2",
      start: 6,
      end: 12
    }, blocks, "进入机长训练");

    expect(source).toMatchObject({
      blockId: "doc-1-checklist-docx-b2",
      blockIndex: 2,
      start: 6,
      end: 12,
      text: "进入机长训练"
    });
  });

  it("uses context to recover a source after coordinates move, but only on unique match", () => {
    const blocks = [
      { id: "doc-1-checklist-docx-b1", documentId: "doc-1-checklist-docx", documentName: "检查单.docx", blockIndex: 1, title: "", text: "新增文字。程序是否规定进入机长训练并完成检查" }
    ];

    const source = locator.resolveSource({
      blockIndex: 1,
      start: 6,
      end: 12,
      text: "进入机长训练",
      beforeText: "程序是否规定",
      afterText: "并完成检查"
    }, blocks, "进入机长训练");

    expect(source).toMatchObject({
      blockId: "doc-1-checklist-docx-b1",
      blockIndex: 1,
      start: 11,
      end: 17,
      text: "进入机长训练"
    });
  });

  it("creates durable manual evidence from a manual match", () => {
    const evidence = locator.makeManualEvidence({
      id: "match-1",
      keywordId: "kw-1",
      keywordText: "训练要求",
      keywordColor: "#ffd666",
      documentId: "manual-1",
      documentName: "运行手册.docx",
      blockId: "manual-1-b3",
      blockIndex: 3,
      title: "训练章节",
      start: 2,
      end: 6,
      mode: "exact",
      matchedText: "训练要求",
      blockText: "机组训练要求应当满足运行手册"
    });

    expect(evidence).toMatchObject({
      documentId: "manual-1",
      documentName: "运行手册.docx",
      blockId: "manual-1-b3",
      blockIndex: 3,
      title: "训练章节",
      start: 2,
      end: 6,
      text: "训练要求",
      beforeText: "机组",
      afterText: "应当满足运行手册",
      mode: "exact"
    });
  });

  it("resolves manual evidence by document name, block index, coordinates and text", () => {
    const documents = [{
      id: "manual-current",
      name: "运行手册.docx",
      blocks: [
        { id: "manual-current-b1", documentId: "manual-current", documentName: "运行手册.docx", blockIndex: 1, title: "", text: "无关段落" },
        { id: "manual-current-b3", documentId: "manual-current", documentName: "运行手册.docx", blockIndex: 3, title: "训练章节", text: "机组训练要求应当满足运行手册" }
      ]
    }];

    const evidence = locator.resolveManualEvidence({
      documentName: "运行手册.docx",
      blockIndex: 3,
      start: 2,
      end: 6,
      text: "训练要求",
      beforeText: "机组",
      afterText: "应当满足运行手册"
    }, documents);

    expect(evidence).toMatchObject({
      documentId: "manual-current",
      documentName: "运行手册.docx",
      blockId: "manual-current-b3",
      blockIndex: 3,
      title: "训练章节",
      start: 2,
      end: 6,
      text: "训练要求"
    });
  });

  it("does not guess a manual evidence location when the same evidence appears multiple times", () => {
    const documents = [{
      id: "manual-current",
      name: "运行手册.docx",
      blocks: [
        { id: "manual-current-b1", documentId: "manual-current", documentName: "运行手册.docx", blockIndex: 1, title: "", text: "训练要求应当满足运行手册" },
        { id: "manual-current-b2", documentId: "manual-current", documentName: "运行手册.docx", blockIndex: 2, title: "", text: "训练要求应当满足运行手册" }
      ]
    }];

    const evidence = locator.resolveManualEvidence({
      documentName: "运行手册.docx",
      text: "训练要求",
      afterText: "应当满足运行手册"
    }, documents);

    expect(evidence).toEqual({
      documentName: "运行手册.docx",
      text: "训练要求",
      afterText: "应当满足运行手册"
    });
  });
});
