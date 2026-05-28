import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { loadToolsData } from "../helpers/browser-context";
import { resolveFromDist } from "../helpers/paths";

describe("tool index data", () => {
  it("uses a single explicit tool list", () => {
    const tools = loadToolsData();

    expect(Array.isArray(tools)).toBe(true);
    expect(tools?.length).toBeGreaterThan(0);

    tools?.forEach((tool) => {
      expect(tool.entry).toMatch(/^[a-z0-9-]+$/);
      expect(tool.status === "done" || tool.status === "wip").toBe(true);
    });
  });

  it("keeps only the confirmed work-in-progress tools", () => {
    const tools = loadToolsData() || [];
    const wipNames = tools
      .filter((tool) => tool.status === "wip")
      .map((tool) => tool.name)
      .sort();

    expect(wipNames).toEqual(["人员结构统计", "培训皇帝"].sort());
  });

  it("ships the done status image used by the tool index", () => {
    expect(fs.existsSync(resolveFromDist("tool", "assets", "status-done.png"))).toBe(true);
  });
});
