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

  it("parses roster rows by header names and fills tech fields", () => {
    const rows = [
      ["姓名", "技术信息", "员工号"],
      ["张三", "777:飞行教员C", "123456"],
      ["李四", "777:A2类副驾驶", 654321],
      ["无工号", "777:C类机长", ""],
      ["", "777:E类副驾驶", "888888"]
    ];

    const parsed = logic.parseRosterRows(rows);
    expect(parsed).toEqual([
      { id: "123456", name: "张三", techInfo: "777:飞行教员C", techLevel: "C" },
      { id: "654321", name: "李四", techInfo: "777:A2类副驾驶", techLevel: "A2" }
    ]);
  });
});
