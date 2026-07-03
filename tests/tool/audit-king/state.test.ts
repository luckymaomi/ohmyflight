import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("audit-king state", () => {
  let stateApi: any;

    beforeAll(() => {
        const context = loadBrowserScripts([
            "tool/app/audit-king/keyword-store.js",
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

  it("enables and disables a keyword explicitly", () => {
    const state = stateApi.createState();
    const keyword = stateApi.addKeyword(state, "训练要求");

    stateApi.setKeywordEnabled(state, keyword.id, false);
    expect(state.keywords[0].enabled).toBe(false);

    stateApi.setKeywordEnabled(state, keyword.id, true);
    expect(state.keywords[0].enabled).toBe(true);
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
});
