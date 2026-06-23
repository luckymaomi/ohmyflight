import { beforeAll, describe, expect, it } from "vitest";

import { loadBrowserScripts } from "../../helpers/browser-context";

describe("pdf stamp logic", () => {
  let logic: any;

  beforeAll(() => {
    const context = loadBrowserScripts(["tool/app/pdf-stamp/logic.js"]);
    logic = context.PdfStampLogic;
  });

  it("parses page ranges with de-duplication and bounds", () => {
    expect(logic.parsePageRange("1, 3-5, 5, 0, 99, a, 8-6", 8)).toEqual([1, 3, 4, 5, 6, 7, 8]);
  });

  it("matches pages by rule mode", () => {
    expect(logic.ruleMatchesPage({ mode: "all", rangeStr: "" }, 2, 5)).toBe(true);
    expect(logic.ruleMatchesPage({ mode: "odd", rangeStr: "" }, 3, 5)).toBe(true);
    expect(logic.ruleMatchesPage({ mode: "even", rangeStr: "" }, 3, 5)).toBe(false);
    expect(logic.ruleMatchesPage({ mode: "range", rangeStr: "2,4-5" }, 4, 5)).toBe(true);
    expect(logic.ruleMatchesPage({ mode: "range", rangeStr: "2,4-5" }, 6, 5)).toBe(false);
  });

  it("creates default rule size from image aspect and converts draw coordinates", () => {
    const rule = logic.createRule(7, 2, { xMm: 10, yMm: 20, wMm: 30, hMm: 15, opacity: 0.5 });
    const options = logic.buildStampDrawOptions(rule, 200);

    expect(rule.id).toBe(7);
    expect(rule.hMm).toBe(15);
    expect(options.x).toBeCloseTo(10 * logic.MM2PT);
    expect(options.width).toBeCloseTo(30 * logic.MM2PT);
    expect(options.height).toBeCloseTo(15 * logic.MM2PT);
    expect(options.y).toBeCloseTo(200 - 20 * logic.MM2PT - 15 * logic.MM2PT);
    expect(options.opacity).toBe(0.5);
  });
});
