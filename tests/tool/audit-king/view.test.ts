import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

function createElement() {
  return {
    innerHTML: "",
    textContent: "",
    className: "",
    clientHeight: 320,
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
      buildBlockWindowContext() {
        return { text: "完整详情", matchStart: 0, matchEnd: 2, truncatedStart: false, truncatedEnd: false };
      },
      buildHighlightSegments(text: string, ranges: any[]) {
        const ordered = [...ranges].sort((left, right) => left.start - right.start || right.end - left.end);
        const segments: Array<{ text: string; keywordIds: string[]; colors: string[] }> = [];
        let cursor = 0;
        ordered.forEach((range) => {
          if (range.start < cursor || range.end <= range.start) return;
          if (range.start > cursor) {
            segments.push({ text: text.slice(cursor, range.start), keywordIds: [], colors: [] });
          }
          segments.push({
            text: text.slice(range.start, range.end),
            keywordIds: [range.keywordId],
            colors: [range.color]
          });
          cursor = range.end;
        });
        if (cursor < text.length) {
          segments.push({ text: text.slice(cursor), keywordIds: [], colors: [] });
        }
        return segments.length ? segments : [{ text, keywordIds: [], colors: [] }];
      }
    };
    viewApi = browserContext.AuditKing.View;
  });

  beforeEach(() => {
    elements = {
      evidenceList: createElement(),
      evidenceCount: createElement(),
      keywordList: createElement(),
      matchList: createElement(),
      matchCount: createElement(),
      matchDetail: createElement()
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
    expect(elements.evidenceList.innerHTML).toContain("新增依据");
    expect(elements.evidenceList.innerHTML).not.toContain("人工选中的依据会放在这里");
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
  });
});
