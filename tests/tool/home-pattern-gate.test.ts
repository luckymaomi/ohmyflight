import { describe, expect, it } from "vitest";

import { createBrowserContext, runBrowserScript } from "../helpers/browser-context";

function loadPatternLogic(): HomePatternGateLogic {
  const context = createBrowserContext();
  return runBrowserScript(
    "tool/home-pattern-gate-logic.js",
    context,
    "window.HomePatternGateLogic"
  ) as HomePatternGateLogic;
}

describe("home pattern gate", () => {
  it("accepts the bottom horizontal line in either direction", () => {
    const logic = loadPatternLogic();

    expect(logic.matches([7, 8, 9])).toBe(true);
    expect(logic.matches([9, 8, 7])).toBe(true);
    expect(logic.matches([1, 2, 3])).toBe(false);
    expect(logic.matches([7, 8])).toBe(false);
  });

  it("fills the middle dot when a swipe crosses it", () => {
    const logic = loadPatternLogic();

    expect(logic.appendNode([7], 9)).toEqual([7, 8, 9]);
    expect(logic.appendNode([9], 7)).toEqual([9, 8, 7]);
  });
});
