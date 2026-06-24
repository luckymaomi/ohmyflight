import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("crew-match-name-id logic", () => {
  let context: ReturnType<typeof loadBrowserScripts>;
  let logic: any;

  beforeAll(() => {
    context = loadBrowserScripts(["tool/app/crew-match-name-id/logic.js"]);
    logic = context.CrewMatchNameIdLogic;
  });

  it("extracts tech level tokens from known tech info formats", () => {
    expect(logic.extractTechLevel("777:飞行教员C")).toBe("C");
    expect(logic.extractTechLevel("777:飞行教员A")).toBe("A");
    expect(logic.extractTechLevel("777:C类机长")).toBe("C");
    expect(logic.extractTechLevel("777:E类副驾驶")).toBe("E");
    expect(logic.extractTechLevel("777:A2类副驾驶")).toBe("A2");
    expect(logic.extractTechLevel("777:A1类副驾驶")).toBe("A1");
  });

  it("parses roster rows by header names and fills department and tech fields", () => {
    const rows = [
      ["姓名", "分部", "技术信息", "员工号"],
      ["张三", "一分部", "777:飞行教员C", "123456"],
      ["李四", "二分部", "777:A2类副驾驶", 654321],
      ["无工号", "三分部", "777:C类机长", ""],
      ["", "四分部", "777:E类副驾驶", "888888"]
    ];

    const parsed = logic.parseRosterRows(rows);
    expect(parsed).toEqual([
      { id: "123456", name: "张三", department: "一分部", techInfo: "777:飞行教员C", techLevel: "C" },
      { id: "654321", name: "李四", department: "二分部", techInfo: "777:A2类副驾驶", techLevel: "A2" }
    ]);
  });

  it("rejects roster rows without department header", () => {
    const rows = [
      ["姓名", "技术信息", "员工号"],
      ["张三", "777:飞行教员C", "123456"]
    ];

    expect(() => logic.parseRosterRows(rows)).toThrow("花名册表头必须包含：员工号、姓名、分部");
  });

  it("builds export rows with stable Excel columns", () => {
    const rows = logic.buildExportRows([
      { id: "123456", name: "张三", department: "一分部", techInfo: "777:飞行教员C", techLevel: "C" },
      { id: "654321", name: "李四", department: "二分部", techInfo: "777:A2类副驾驶", techLevel: "A2" }
    ]);

    expect(rows).toEqual([
      ["姓名", "员工号", "分部", "技术信息", "技术等级"],
      ["张三", "123456", "一分部", "777:飞行教员C", "C"],
      ["李四", "654321", "二分部", "777:A2类副驾驶", "A2"]
    ]);
  });
});
