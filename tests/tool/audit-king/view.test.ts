import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

function createElement() {
  return {
    innerHTML: "",
    textContent: "",
    className: "",
    clientHeight: 320,
    scrollHeight: 960,
    scrollTop: 0,
    offsetTop: 0,
    querySelector(_selector?: string) {
      return null;
    },
    querySelectorAll(_selector?: string) {
      return [];
    }
  };
}

describe("audit-king view", () => {
  let viewApi: any;
  let browserContext: any;
  let elements: Record<string, ReturnType<typeof createElement>>;
  let lastBlockWindowTargetLength = 0;
  let blockWindowTruncated = false;

  beforeAll(() => {
    elements = {};
    const document = {
      getElementById(id: string) {
        return elements[id] || null;
      }
    };
    browserContext = loadBrowserScripts(["tool/app/audit-king/view.js"], { document });
    browserContext.AuditKing.SearchEngine = {
      filterMatches(matches: any[]) {
        return matches;
      }
    };
    browserContext.AuditKing.Highlight = {
      buildContext(text: string) {
        return { text, offset: 0, truncatedStart: false, truncatedEnd: false };
      },
      buildBlockWindowContext(_blocks: any[], options: any) {
        lastBlockWindowTargetLength = options.targetLength;
        return { text: "完整详情", matchStart: 0, matchEnd: 2, truncatedStart: blockWindowTruncated, truncatedEnd: blockWindowTruncated };
      },
      buildHighlightSegments(text: string, ranges: any[]) {
        const ordered = [...ranges].sort((left, right) => left.start - right.start || right.end - left.end);
        const segments: Array<{ text: string; keywordIds: string[]; evidenceIds: string[]; colors: string[] }> = [];
        let cursor = 0;
        ordered.forEach((range) => {
          if (range.start < cursor || range.end <= range.start) return;
          if (range.start > cursor) {
            segments.push({ text: text.slice(cursor, range.start), keywordIds: [], evidenceIds: [], colors: [] });
          }
          segments.push({
            text: text.slice(range.start, range.end),
            keywordIds: range.kind === "manual-evidence" ? [] : [range.keywordId],
            evidenceIds: range.kind === "manual-evidence" ? [range.evidenceId || range.keywordId] : [],
            colors: [range.color]
          });
          cursor = range.end;
        });
        if (cursor < text.length) {
          segments.push({ text: text.slice(cursor), keywordIds: [], evidenceIds: [], colors: [] });
        }
        return segments.length ? segments : [{ text, keywordIds: [], evidenceIds: [], colors: [] }];
      }
    };
    viewApi = browserContext.AuditKing.View;
  });

  beforeEach(() => {
    lastBlockWindowTargetLength = 0;
    blockWindowTruncated = false;
    elements = {
      evidenceList: createElement(),
      evidenceCount: createElement(),
      keywordList: createElement(),
      manualList: createElement(),
      manualFilter: createElement(),
      matchList: createElement(),
      matchCount: createElement(),
      matchDetail: createElement(),
      matchDetailContextLabel: createElement(),
      expandMatchDetailBtn: createElement(),
      addSelectedManualEvidenceBtn: createElement(),
      keywordEvidenceList: createElement(),
      keywordEvidenceCount: createElement()
    };
  });

  it("renders audit basket groups even when they have no evidence yet", () => {
    viewApi.renderEvidence({
      evidenceGroups: [
        { id: "evidence-group-1", title: "1.1 训练资格", items: [] },
        { id: "evidence-group-2", title: "1.2 检查要求", items: [] }
      ]
    });

    expect(elements.evidenceCount.textContent).toBe("2 个条款 / 0 条依据");
    expect(elements.evidenceList.innerHTML).toContain("1.1 训练资格");
    expect(elements.evidenceList.innerHTML).toContain("1.2 检查要求");
    expect(elements.evidenceList.innerHTML).toContain("data-action=\"edit-evidence-group-order\"");
    expect(elements.evidenceList.innerHTML).toContain("value=\"1\"");
    expect(elements.evidenceList.innerHTML).toContain("新增依据");
    expect(elements.evidenceList.innerHTML).not.toContain("人工选中的依据会放在这里");
  });

  it("scrolls audit basket to the bottom after a new group is added", () => {
    elements.evidenceList.scrollTop = 0;
    elements.evidenceList.scrollHeight = 1200;

    viewApi.scrollEvidenceToBottom();

    expect(elements.evidenceList.scrollTop).toBe(1200);
  });

  it("renders match cards as direct detail targets without a separate detail button", () => {
    viewApi.renderMatches({
      currentKeywordId: "all",
      currentMatchIndex: 0,
      documentFilterId: "all",
      documents: [{ id: "doc-1", name: "运行手册", blocks: [{ id: "block-1", text: "完整详情" }] }],
      searchResult: {
        matches: [{
          id: "match-1",
          keywordId: "keyword-1",
          keywordText: "训练",
          keywordColor: "#ffd666",
          documentId: "doc-1",
          documentName: "运行手册",
          blockId: "block-1",
          blockIndex: 3,
          blockText: "飞行员训练要求",
          title: "",
          start: 3,
          end: 5,
          matchedText: "训练",
          mode: "exact"
        }],
        countsByKeyword: {}
      }
    });

    expect(elements.matchCount.textContent).toBe("1 条命中");
    expect(elements.matchList.innerHTML).toContain('data-action="focus-match"');
    expect(elements.matchList.innerHTML).toContain('role="button"');
    expect(elements.matchList.innerHTML).not.toContain("查看详情");
  });

  it("renders bind and unbind actions on match cards for the current keyword", () => {
    const match = {
      id: "match-1",
      keywordId: "keyword-1",
      keywordText: "训练",
      keywordColor: "#ffd666",
      documentId: "doc-1",
      documentName: "运行手册",
      blockId: "block-1",
      blockIndex: 3,
      blockText: "飞行员训练要求",
      title: "",
      start: 3,
      end: 5,
      matchedText: "训练",
      mode: "exact"
    };

    viewApi.renderMatches({
      currentKeywordId: "keyword-1",
      currentMatchIndex: 0,
      documentFilterId: "all",
      documents: [{ id: "doc-1", name: "运行手册", blocks: [{ id: "block-1", text: "完整详情" }] }],
      keywords: [{
        id: "keyword-1",
        text: "训练",
        evidences: []
      }],
      searchResult: {
        matches: [match],
        countsByKeyword: {}
      }
    });

    expect(elements.matchList.innerHTML).toContain("加入手册证据");
    expect(elements.matchList.innerHTML).toContain('data-action="bind-match-evidence"');
    expect(elements.matchList.innerHTML).toContain("match-location");
    expect(elements.matchList.innerHTML).toContain("match-evidence-action");

    viewApi.renderMatches({
      currentKeywordId: "keyword-1",
      currentMatchIndex: 0,
      documentFilterId: "all",
      documents: [{ id: "doc-1", name: "运行手册", blocks: [{ id: "block-1", text: "完整详情" }] }],
      keywords: [{
        id: "keyword-1",
        text: "训练",
        evidences: [{
          id: "manual-evidence-1",
          documentId: "doc-1",
          documentName: "运行手册",
          blockId: "block-1",
          blockIndex: 3,
          start: 3,
          end: 5,
          text: "训练"
        }]
      }],
      searchResult: {
        matches: [match],
        countsByKeyword: {}
      }
    });

    expect(elements.matchList.innerHTML).toContain("移出手册证据");
    expect(elements.matchList.innerHTML).toContain('data-action="unbind-match-evidence"');
    expect(elements.matchList.innerHTML).toContain("bound-evidence");
    expect(elements.matchList.innerHTML).toContain("已绑定证据");
  });

  it("keeps manual evidence binding out of the full detail panel", () => {
    viewApi.renderMatchDetail({
      currentKeywordId: "keyword-1",
      currentMatchIndex: 0,
      documentFilterId: "all",
      documents: [{ id: "doc-1", name: "运行手册", blocks: [{ id: "block-1", text: "完整详情" }] }],
      searchResult: {
        matches: [{
          id: "match-1",
          keywordId: "keyword-1",
          keywordText: "训练",
          keywordColor: "#ffd666",
          documentId: "doc-1",
          documentName: "运行手册",
          blockId: "block-1",
          blockIndex: 3,
          blockText: "飞行员训练要求",
          title: "",
          start: 3,
          end: 5,
          matchedText: "训练",
          mode: "exact"
        }],
        countsByKeyword: {}
      }
    });

    expect(elements.matchDetail.innerHTML).toContain("detail-text");
    expect(lastBlockWindowTargetLength).toBe(2000);
    expect(elements.matchDetail.innerHTML).not.toContain("绑定为手册证据");
    expect(elements.matchDetail.innerHTML).not.toContain('data-action="bind-manual-evidence"');
    expect(elements.addSelectedManualEvidenceBtn.textContent).toBe("选中内容加入手册证据");
    expect((elements.addSelectedManualEvidenceBtn as any).disabled).toBe(false);
  });

  it("shows a load-more context action when the full detail panel is truncated", () => {
    blockWindowTruncated = true;

    viewApi.renderMatchDetail({
      currentKeywordId: "keyword-1",
      currentMatchIndex: 0,
      currentDetailContextLength: 4000,
      documentFilterId: "all",
      documents: [{ id: "doc-1", name: "运行手册", blocks: [{ id: "block-1", text: "完整详情" }] }],
      searchResult: {
        matches: [{
          id: "match-1",
          keywordId: "keyword-1",
          keywordText: "训练",
          keywordColor: "#ffd666",
          documentId: "doc-1",
          documentName: "运行手册",
          blockId: "block-1",
          blockIndex: 3,
          blockText: "飞行员训练要求",
          title: "",
          start: 3,
          end: 5,
          matchedText: "训练",
          mode: "exact"
        }],
        countsByKeyword: {}
      }
    });

    expect(lastBlockWindowTargetLength).toBe(4000);
    expect(elements.matchDetail.innerHTML).not.toContain("查看更多上下文");
    expect(elements.matchDetailContextLabel.textContent).toBe("已加载约 4000 字");
    expect(elements.expandMatchDetailBtn.textContent).toBe("查看更多上下文");
    expect((elements.expandMatchDetailBtn as any).disabled).toBe(false);
  });

  it("highlights selected manual evidence in the full detail text with background color", () => {
    const originalBuildBlockWindowContext = browserContext.AuditKing.Highlight.buildBlockWindowContext;
    browserContext.AuditKing.Highlight.buildBlockWindowContext = () => ({
      text: "前文手册证据内容后文关键词",
      matchStart: 10,
      matchEnd: 13,
      truncatedStart: false,
      truncatedEnd: false,
      windowStart: 100,
      windowEnd: 113
    });

    viewApi.renderMatchDetail({
      currentKeywordId: "keyword-1",
      currentMatchIndex: 0,
      currentDetailContextLength: 2000,
      documentFilterId: "all",
      documents: [{ id: "doc-1", name: "运行手册", blocks: [{ id: "block-1", text: "前文手册证据内容后文关键词" }] }],
      keywords: [{
        id: "keyword-1",
        text: "关键词",
        color: "#ffd666",
        enabled: true,
        evidences: [{
          id: "evidence-1",
          sourceType: "selection",
          documentId: "doc-1",
          documentName: "运行手册",
          globalStart: 102,
          globalEnd: 106,
          text: "手册证据"
        }]
      }],
      searchResult: {
        matches: [{
          id: "match-1",
          keywordId: "keyword-1",
          keywordText: "关键词",
          keywordColor: "#ffd666",
          documentId: "doc-1",
          documentName: "运行手册",
          blockId: "block-1",
          blockIndex: 3,
          blockText: "前文手册证据内容后文关键词",
          title: "",
          start: 10,
          end: 13,
          matchedText: "关键词",
          mode: "exact"
        }],
        countsByKeyword: {}
      }
    });

    expect(elements.matchDetail.innerHTML).toContain("ak-manual-evidence-highlight");
    expect(elements.matchDetail.innerHTML).toContain('data-evidence-ids="evidence-1"');
    expect(elements.matchDetail.innerHTML).toContain("background:#d1e7dd");
    expect(elements.matchDetail.innerHTML).toContain("手册证据");

    browserContext.AuditKing.Highlight.buildBlockWindowContext = originalBuildBlockWindowContext;
  });

  it("scrolls checklist reference panel to the current keyword highlight", () => {
    const highlight = {
      dataset: { keywordIds: "keyword-1" },
      offsetTop: 1000
    };
    const activeBlock = {
      offsetTop: 900,
      querySelectorAll() {
        return [highlight];
      }
    };
    elements.checklistText = {
      ...createElement(),
      clientHeight: 200,
      querySelector(selector: string) {
        return selector === ".active-source" ? activeBlock : null;
      },
      querySelectorAll() {
        return [];
      }
    };

    viewApi.focusChecklistHighlight({
      currentKeywordId: "keyword-1"
    });

    expect(elements.checklistText.scrollTop).toBe(930);
  });

  it("only highlights the selected source occurrence in checklist reference", () => {
    elements.checklistText = createElement();
    const text = "第一处训练要求，第二处训练要求";
    const selectedStart = text.indexOf("训练要求");

    viewApi.renderChecklist({
      currentKeywordId: "keyword-1",
      checklistBlocks: [{
        id: "checklist-block-1",
        documentId: "checklist",
        documentName: "检查单.docx",
        blockIndex: 1,
        title: "",
        text
      }],
      keywords: [{
        id: "keyword-1",
        text: "训练要求",
        color: "#ffd666",
        enabled: true,
        source: {
          blockId: "checklist-block-1",
          start: selectedStart,
          end: selectedStart + "训练要求".length
        }
      }]
    });

    const highlightCount = (elements.checklistText.innerHTML.match(/class="ak-highlight"/g) || []).length;
    expect(highlightCount).toBe(1);
    expect(elements.checklistText.innerHTML).toContain("第一处");
    expect(elements.checklistText.innerHTML).toContain("第二处训练要求");
  });

  it("shows keyword source status for located, review-needed and source-less keywords", () => {
    viewApi.renderKeywords({
      currentKeywordId: "keyword-1",
      checklistBlocks: [{
        id: "checklist-block-1",
        documentId: "checklist",
        documentName: "检查单.docx",
        blockIndex: 1,
        title: "",
        text: "程序是否规定进入机长训练"
      }],
      searchResult: {
        countsByKeyword: {
          "keyword-1": 2,
          "keyword-2": 0,
          "keyword-3": 1
        }
      },
      keywords: [
        {
          id: "keyword-1",
          text: "机长训练",
          label: "1.1 机组资格",
          color: "#ffd666",
          enabled: true,
          source: {
            blockId: "checklist-block-1",
            blockIndex: 1,
            start: 6,
            end: 12,
            text: "进入机长训练"
          }
        },
        {
          id: "keyword-2",
          text: "副驾驶训练",
          color: "#22c55e",
          enabled: true,
          source: {
            blockId: "missing-block",
            blockIndex: 2,
            start: 0,
            end: 5,
            text: "副驾驶"
          }
        },
        {
          id: "keyword-3",
          text: "证件",
          color: "#3b82f6",
          enabled: true
        }
      ]
    });

    expect(elements.keywordList.innerHTML).toContain("已定位");
    expect(elements.keywordList.innerHTML).toContain("需人工确认");
    expect(elements.keywordList.innerHTML).toContain("无来源");
    expect(elements.keywordList.innerHTML).toContain("data-action=\"edit-keyword-order\"");
    expect(elements.keywordList.innerHTML).toContain("value=\"1\"");
    expect(elements.keywordList.innerHTML).toContain("data-action=\"edit-keyword-label\"");
    expect(elements.keywordList.innerHTML).toContain("1.1 机组资格");
  });

  it("shows manual evidence counts in the keyword pool", () => {
    viewApi.renderKeywords({
      currentKeywordId: "keyword-1",
      checklistBlocks: [],
      searchResult: {
        countsByKeyword: {
          "keyword-1": 2
        }
      },
      keywords: [
        {
          id: "keyword-1",
          text: "机长训练",
          color: "#ffd666",
          enabled: true,
          evidences: [
            { id: "evidence-1", documentName: "运行手册.docx", blockIndex: 1, text: "机长训练" },
            { id: "evidence-2", documentName: "训练大纲.docx", blockIndex: 2, text: "机长训练" }
          ]
        }
      ]
    });

    expect(elements.keywordList.innerHTML).toContain("2 条证据");
  });

  it("renders manual evidences for the current keyword with remove actions", () => {
    viewApi.renderKeywordEvidences({
      currentKeywordId: "keyword-1",
      keywords: [
        {
          id: "keyword-1",
          text: "机长训练",
          color: "#ffd666",
          evidences: [
            {
              id: "evidence-1",
              documentName: "运行手册.docx",
              blockIndex: 3,
              title: "训练章节",
              text: "机长训练要求",
              mode: "exact",
              note: "已确认"
            }
          ]
        }
      ]
    });

    expect(elements.keywordEvidenceCount.textContent).toBe("1 条手册证据");
    expect(elements.keywordEvidenceList.innerHTML).toContain("运行手册.docx / 第 3 段");
    expect(elements.keywordEvidenceList.innerHTML).toContain("机长训练要求");
    expect(elements.keywordEvidenceList.innerHTML).toContain("已确认");
    expect(elements.keywordEvidenceList.innerHTML).toContain('data-action="remove-manual-evidence"');
  });

  it("renders disabled manuals in the manual list but excludes them from the result filter", () => {
    viewApi.renderDocuments({
      documentFilterId: "manual-disabled",
      documents: [
        { id: "manual-enabled", name: "运行手册.docx", enabled: true, blocks: [{ id: "b1" }] },
        { id: "manual-disabled", name: "训练大纲.docx", enabled: false, blocks: [{ id: "b2" }, { id: "b3" }] }
      ]
    });

    expect(elements.manualList.innerHTML).toContain("运行手册.docx");
    expect(elements.manualList.innerHTML).toContain("训练大纲.docx");
    expect(elements.manualList.innerHTML).toContain("已停用");
    expect(elements.manualList.innerHTML).toContain("data-action=\"toggle-document\"");
    expect(elements.manualFilter.innerHTML).toContain("运行手册.docx");
    expect(elements.manualFilter.innerHTML).not.toContain("训练大纲.docx");
    expect((elements.manualFilter as any).value).toBe("all");
  });
});
