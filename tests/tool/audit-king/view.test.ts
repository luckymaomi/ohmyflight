import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

function createElement() {
  return {
    innerHTML: "",
    textContent: "",
    className: ""
  };
}

describe("audit-king view", () => {
  let viewApi: any;
  let elements: Record<string, ReturnType<typeof createElement>>;

  beforeAll(() => {
    elements = {
      evidenceList: createElement(),
      evidenceCount: createElement()
    };
    const document = {
      getElementById(id: string) {
        return elements[id] || null;
      }
    };
    const context = loadBrowserScripts(["tool/app/audit-king/view.js"], { document });
    viewApi = (context.AuditKing as any).View;
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
});
