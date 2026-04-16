import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadToolsData } from "../helpers/browser-context";
import { resolveFromDist } from "../helpers/paths";

function getRegisteredEntries() {
  return new Set(
    loadToolsData()
      .flatMap((section) => section.items)
      .map((item) => item.entry)
      .filter(Boolean)
  );
}

describe("tool directory coverage", () => {
  it("every direct tool directory with index.html is registered in tool/tools-data.js", () => {
    const appRoot = resolveFromDist("tool", "app");
    const registeredEntries = getRegisteredEntries();
    const toolDirs = fs.readdirSync(appRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((entryName) => fs.existsSync(path.join(appRoot, entryName, "index.html")));

    toolDirs.forEach((entryName) => {
      expect(registeredEntries.has(entryName), `${entryName} is missing from tool/tools-data.js`).toBe(true);
    });
  });
});
