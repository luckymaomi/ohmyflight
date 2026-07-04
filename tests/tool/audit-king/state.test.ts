import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("audit-king state", () => {
  let stateApi: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/audit-king/keyword-store.js",
            "tool/app/audit-king/source-locator.js",
            "tool/app/audit-king/state.js"
        ]);
        stateApi = (context.AuditKing as any).State;
    });

  it("stores manual keywords without automatic extraction", () => {
    const state = stateApi.createState();
    stateApi.setChecklistBlocks(state, [
      { id: "c1", documentId: "checklist", documentName: "检查单.docx", blockIndex: 1, title: "", text: "程序是否规定进入机长训练" }
    ]);

    const first = stateApi.addKeyword(state, "进入机长训练");
    const second = stateApi.addKeyword(state, "机长训练");

    expect(state.keywords.map((keyword: any) => keyword.text)).toEqual(["进入机长训练", "机长训练"]);
    expect(first.color).not.toBe(second.color);
    expect(state.checklistBlocks[0].text).toBe("程序是否规定进入机长训练");
  });

  it("inserts a selected checklist keyword below the current keyword when requested", () => {
    const state = stateApi.createState();
    const first = stateApi.addKeyword(state, "训练要求");
    stateApi.addKeyword(state, "证件携带");
    stateApi.setCurrentKeyword(state, first.id);

    const inserted = stateApi.addKeyword(state, "进入机长训练", {
      blockId: "checklist-b1",
      start: 6,
      end: 12
    }, {
      afterKeywordId: first.id
    });

    expect(state.keywords.map((keyword: any) => keyword.text)).toEqual(["训练要求", "进入机长训练", "证件携带"]);
    expect(inserted.source).toEqual({ blockId: "checklist-b1", start: 6, end: 12 });
    expect(state.currentKeywordId).toBe(first.id);
  });

  it("updates filters and removes keywords explicitly", () => {
    const state = stateApi.createState();
    const keyword = stateApi.addKeyword(state, "进入条件");
    stateApi.setCurrentKeyword(state, keyword.id);
    stateApi.setDocumentFilter(state, "manual-1");

    expect(state.currentKeywordId).toBe(keyword.id);
    expect(state.documentFilterId).toBe("manual-1");

    stateApi.removeKeyword(state, keyword.id);

    expect(state.keywords).toEqual([]);
    expect(state.currentKeywordId).toBe("all");
  });

  it("keeps match detail context length temporary and resets it on keyword or filter changes", () => {
    const state = stateApi.createState();
    const keyword = stateApi.addKeyword(state, "进入条件");

    expect(state.currentDetailContextLength).toBe(2000);

    stateApi.expandMatchDetailContext(state);
    stateApi.expandMatchDetailContext(state);

    expect(state.currentDetailContextLength).toBe(6000);

    stateApi.setDocumentFilter(state, "manual-1");

    expect(state.currentDetailContextLength).toBe(2000);

    stateApi.expandMatchDetailContext(state);
    stateApi.setCurrentKeyword(state, keyword.id);

    expect(state.currentDetailContextLength).toBe(2000);
  });

  it("enables and disables a keyword explicitly", () => {
    const state = stateApi.createState();
    const keyword = stateApi.addKeyword(state, "训练要求");

    stateApi.setKeywordEnabled(state, keyword.id, false);
    expect(state.keywords[0].enabled).toBe(false);

    stateApi.setKeywordEnabled(state, keyword.id, true);
    expect(state.keywords[0].enabled).toBe(true);
  });

  it("moves keywords to a target position without changing their content", () => {
    const state = stateApi.createState();
    const first = stateApi.addKeyword(state, "训练要求", { blockId: "checklist-b1", start: 0, end: 4 });
    const second = stateApi.addKeyword(state, "证件携带");
    const third = stateApi.addKeyword(state, "机长资格");
    stateApi.setCurrentKeyword(state, second.id);

    stateApi.moveKeywordToPosition(state, third.id, 1);

    expect(state.keywords.map((keyword: any) => keyword.text)).toEqual(["机长资格", "训练要求", "证件携带"]);
    expect(state.keywords.find((keyword: any) => keyword.id === first.id).source).toEqual({ blockId: "checklist-b1", start: 0, end: 4 });
    expect(state.currentKeywordId).toBe(second.id);
  });

  it("clamps keyword target positions to the available range", () => {
    const state = stateApi.createState();
    const first = stateApi.addKeyword(state, "训练要求");
    const second = stateApi.addKeyword(state, "证件携带");
    const third = stateApi.addKeyword(state, "机长资格");

    stateApi.moveKeywordToPosition(state, first.id, 99);

    expect(state.keywords.map((keyword: any) => keyword.text)).toEqual(["证件携带", "机长资格", "训练要求"]);

    stateApi.moveKeywordToPosition(state, third.id, 0);

    expect(state.keywords.map((keyword: any) => keyword.text)).toEqual(["机长资格", "证件携带", "训练要求"]);
    expect(state.keywords.map((keyword: any) => keyword.id).sort()).toEqual([first.id, second.id, third.id].sort());
  });

  it("appends and removes manuals without replacing unrelated manuals", () => {
    const state = stateApi.createState();
    const first = { id: "manual-1", name: "运行手册.docx", blocks: [] };
    const second = { id: "manual-2", name: "训练大纲.docx", blocks: [] };

    stateApi.appendDocuments(state, [first]);
    stateApi.appendDocuments(state, [second]);
    stateApi.setDocumentFilter(state, "manual-2");

    expect(state.documents.map((documentItem: any) => documentItem.name)).toEqual(["运行手册.docx", "训练大纲.docx"]);

    stateApi.removeDocument(state, "manual-2");

    expect(state.documents.map((documentItem: any) => documentItem.id)).toEqual(["manual-1"]);
    expect(state.documentFilterId).toBe("all");
  });

  it("enables and disables manuals as the searchable document scope", () => {
    const state = stateApi.createState();
    stateApi.appendDocuments(state, [
      { id: "manual-1", name: "运行手册.docx", blocks: [] },
      { id: "manual-2", name: "训练大纲.docx", blocks: [] }
    ]);
    stateApi.setDocumentFilter(state, "manual-2");

    stateApi.setDocumentEnabled(state, "manual-2", false);

    expect(state.documents.find((documentItem: any) => documentItem.id === "manual-2").enabled).toBe(false);
    expect(stateApi.getEnabledDocuments(state).map((documentItem: any) => documentItem.id)).toEqual(["manual-1"]);
    expect(state.documentFilterId).toBe("all");

    stateApi.setDocumentEnabled(state, "manual-2", true);

    expect(stateApi.getEnabledDocuments(state).map((documentItem: any) => documentItem.id)).toEqual(["manual-1", "manual-2"]);
  });

  it("stores checklist source when a keyword is created from selected checklist text", () => {
    const state = stateApi.createState();

    const keyword = stateApi.addKeyword(state, "进入机长训练", {
      blockId: "checklist-b1",
      start: 6,
      end: 12
    });

    expect(keyword.source).toEqual({
      blockId: "checklist-b1",
      start: 6,
      end: 12
    });
  });

  it("resolves imported legacy keyword sources when checklist blocks are loaded", () => {
    const state = stateApi.createState();

    stateApi.replaceKeywords(state, [{
      text: "进入机长训练",
      color: "#f59e0b",
      enabled: true,
      source: {
        blockId: "doc-1-1783044084949-checklist-docx-b2",
        blockIndex: 2,
        start: 6,
        end: 12
      }
    }]);
    stateApi.setChecklistBlocks(state, [
      { id: "doc-1-checklist-docx-b1", documentId: "doc-1-checklist-docx", documentName: "检查单.docx", blockIndex: 1, title: "", text: "无关段落" },
      { id: "doc-1-checklist-docx-b2", documentId: "doc-1-checklist-docx", documentName: "检查单.docx", blockIndex: 2, title: "", text: "程序是否规定进入机长训练" }
    ]);

    expect(state.keywords[0].source).toMatchObject({
      blockId: "doc-1-checklist-docx-b2",
      blockIndex: 2,
      start: 6,
      end: 12,
      text: "进入机长训练"
    });
  });

  it("updates a keyword source without changing the keyword text", () => {
    const state = stateApi.createState();
    const keyword = stateApi.addKeyword(state, "机长训练");

    stateApi.updateKeywordSource(state, keyword.id, {
      blockId: "checklist-b3",
      blockIndex: 3,
      start: 5,
      end: 13,
      text: "进入机长训练"
    });

    expect(state.keywords[0].text).toBe("机长训练");
    expect(state.keywords[0].source).toMatchObject({
      blockId: "checklist-b3",
      blockIndex: 3,
      start: 5,
      end: 13,
      text: "进入机长训练"
    });
  });

  it("clears a keyword source without changing the keyword text or search fields", () => {
    const state = stateApi.createState();
    const keyword = stateApi.addKeyword(state, "机长训练", {
      blockId: "checklist-b3",
      blockIndex: 3,
      start: 5,
      end: 13,
      text: "进入机长训练"
    });
    stateApi.updateKeywordLabel(state, keyword.id, "1.1 机组资格");

    stateApi.clearKeywordSource(state, keyword.id);

    expect(state.keywords[0].text).toBe("机长训练");
    expect(state.keywords[0].label).toBe("1.1 机组资格");
    expect(state.keywords[0].enabled).toBe(true);
    expect(state.keywords[0].source).toBeUndefined();
  });

  it("stores multiple manual evidences on a keyword without changing checklist source or audit basket", () => {
    const state = stateApi.createState();
    const keyword = stateApi.addKeyword(state, "训练要求", {
      blockId: "checklist-b1",
      blockIndex: 1,
      start: 2,
      end: 6,
      text: "训练要求"
    });
    stateApi.addEvidenceGroup(state, "1.1 人工条款", { createInitialEntry: true });

    const first = stateApi.addKeywordEvidence(state, keyword.id, {
      documentId: "manual-1",
      documentName: "运行手册.docx",
      blockId: "manual-1-b3",
      blockIndex: 3,
      start: 10,
      end: 14,
      text: "训练要求",
      beforeText: "机组",
      afterText: "应当",
      mode: "exact",
      note: "第一处"
    });
    const second = stateApi.addKeywordEvidence(state, keyword.id, {
      documentId: "manual-2",
      documentName: "训练大纲.docx",
      blockId: "manual-2-b8",
      blockIndex: 8,
      start: 4,
      end: 8,
      text: "训练要求",
      beforeText: "进入",
      afterText: "检查",
      mode: "loose"
    });

    expect(state.keywords[0].source).toMatchObject({
      blockId: "checklist-b1",
      text: "训练要求"
    });
    expect(state.keywords[0].evidences).toEqual([
      {
        id: first.id,
        documentId: "manual-1",
        documentName: "运行手册.docx",
        blockId: "manual-1-b3",
        blockIndex: 3,
        title: "",
        start: 10,
        end: 14,
        text: "训练要求",
        beforeText: "机组",
        afterText: "应当",
        mode: "exact",
        note: "第一处"
      },
      {
        id: second.id,
        documentId: "manual-2",
        documentName: "训练大纲.docx",
        blockId: "manual-2-b8",
        blockIndex: 8,
        title: "",
        start: 4,
        end: 8,
        text: "训练要求",
        beforeText: "进入",
        afterText: "检查",
        mode: "loose",
        note: ""
      }
    ]);
    expect(state.evidenceGroups).toEqual([
      {
        id: "evidence-group-1",
        title: "1.1 人工条款",
        items: [{ content: "", note: "" }]
      }
    ]);
  });

  it("removes one manual evidence without removing the keyword or other evidences", () => {
    const state = stateApi.createState();
    const keyword = stateApi.addKeyword(state, "训练要求");
    const first = stateApi.addKeywordEvidence(state, keyword.id, {
      documentName: "运行手册.docx",
      blockIndex: 3,
      start: 10,
      end: 14,
      text: "训练要求"
    });
    stateApi.addKeywordEvidence(state, keyword.id, {
      documentName: "训练大纲.docx",
      blockIndex: 8,
      start: 4,
      end: 8,
      text: "训练要求"
    });

    stateApi.removeKeywordEvidence(state, keyword.id, first.id);

    expect(state.keywords).toHaveLength(1);
    expect(state.keywords[0].evidences.map((evidence: any) => evidence.documentName)).toEqual(["训练大纲.docx"]);
  });

  it("resolves keyword manual evidences when manuals are loaded without affecting keyword search text", () => {
    const state = stateApi.createState();
    stateApi.replaceKeywords(state, [{
      text: "训练要求",
      evidences: [{
        documentName: "运行手册.docx",
        blockIndex: 2,
        start: 0,
        end: 4,
        text: "训练要求",
        beforeText: "",
        afterText: "应当"
      }]
    }]);

    stateApi.setDocuments(state, [{
      id: "manual-current",
      name: "运行手册.docx",
      blocks: [
        { id: "manual-current-b1", documentId: "manual-current", documentName: "运行手册.docx", blockIndex: 1, title: "", text: "无关段落" },
        { id: "manual-current-b2", documentId: "manual-current", documentName: "运行手册.docx", blockIndex: 2, title: "", text: "训练要求应当符合手册" }
      ]
    }]);

    expect(state.keywords[0].text).toBe("训练要求");
    expect(state.keywords[0].evidences[0]).toMatchObject({
      documentId: "manual-current",
      documentName: "运行手册.docx",
      blockId: "manual-current-b2",
      blockIndex: 2,
      start: 0,
      end: 4,
      text: "训练要求"
    });
  });

  it("updates a keyword label without changing the keyword text", () => {
    const state = stateApi.createState();
    const keyword = stateApi.addKeyword(state, "机长训练");

    stateApi.updateKeywordLabel(state, keyword.id, "1.1 机组资格");

    expect(state.keywords[0].text).toBe("机长训练");
    expect(state.keywords[0].label).toBe("1.1 机组资格");
  });

  it("creates and edits audit basket groups independently", () => {
    const state = stateApi.createState();

    stateApi.addEvidenceGroup(state, "1.1 训练资格");
    stateApi.updateEvidenceGroupTitle(state, 0, "1.1 机组训练资格");

    expect(state.evidenceGroups).toEqual([
      {
        id: "evidence-group-1",
        title: "1.1 机组训练资格",
        items: []
      }
    ]);
  });

  it("can create the first blank evidence row when adding an audit basket group", () => {
    const state = stateApi.createState();

    stateApi.addEvidenceGroup(state, "1.1 训练资格", { createInitialEntry: true });

    expect(state.evidenceGroups).toEqual([
      {
        id: "evidence-group-1",
        title: "1.1 训练资格",
        items: [{ content: "", note: "" }]
      }
    ]);
  });

  it("moves audit basket groups as complete clause units", () => {
    const state = stateApi.createState();

    stateApi.addEvidenceGroup(state, "1.1 训练资格");
    stateApi.addEvidenceEntry(state, 0, "依据内容 A", "备注 A");
    stateApi.addEvidenceGroup(state, "1.2 检查要求");
    stateApi.addEvidenceEntry(state, 1, "依据内容 B", "备注 B");
    stateApi.addEvidenceGroup(state, "1.3 运行程序");

    stateApi.moveEvidenceGroupToPosition(state, 0, 3);

    expect(state.evidenceGroups.map((group: any) => group.title)).toEqual(["1.2 检查要求", "1.3 运行程序", "1.1 训练资格"]);
    expect(state.evidenceGroups[2].items).toEqual([{ content: "依据内容 A", note: "备注 A" }]);

    stateApi.moveEvidenceGroupToPosition(state, 2, 1);

    expect(state.evidenceGroups.map((group: any) => group.title)).toEqual(["1.1 训练资格", "1.2 检查要求", "1.3 运行程序"]);
  });

  it("adds and edits audit basket content manually", () => {
    const state = stateApi.createState();

    stateApi.addEvidenceGroup(state, "1.1 训练资格");
    stateApi.addEvidenceEntry(state, 0, "依据内容 A", "备注 A");
    stateApi.addEvidenceEntry(state, 0, "依据内容 B", "");
    stateApi.updateEvidenceEntry(state, 0, 1, { content: "依据内容 B 修订", note: "备注 B" });

    expect(state.evidenceGroups[0].items).toEqual([
      { content: "依据内容 A", note: "备注 A" },
      { content: "依据内容 B 修订", note: "备注 B" }
    ]);
  });

  it("removes audit basket content and groups explicitly", () => {
    const state = stateApi.createState();

    stateApi.addEvidenceGroup(state, "1.1 训练资格");
    stateApi.addEvidenceGroup(state, "1.2 检查要求");
    stateApi.addEvidenceEntry(state, 0, "依据内容 A", "");
    stateApi.addEvidenceEntry(state, 0, "依据内容 B", "");

    stateApi.removeEvidenceEntry(state, 0, 0);

    expect(state.evidenceGroups[0].items).toEqual([{ content: "依据内容 B", note: "" }]);

    stateApi.removeEvidenceGroup(state, 0);

    expect(state.evidenceGroups.map((group: any) => group.title)).toEqual(["1.2 检查要求"]);
  });
});
