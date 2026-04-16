import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadToolsData } from "../helpers/browser-context";
import { collectLocalAssetPaths } from "../helpers/html";
import { resolveFromDist } from "../helpers/paths";

function flattenToolItems() {
  return loadToolsData().flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      category: section.category
    }))
  );
}

describe("tool entry smoke tests", () => {
  const items = flattenToolItems();

  it("all tool entries are unique", () => {
    const entries = items
      .map((item) => item.entry)
      .filter(Boolean);

    expect(new Set(entries).size).toBe(entries.length);
  });

  it("all local tool entry directories contain an index.html", () => {
    items.forEach((item) => {
      if (!item.entry) return;

      const toolDir = resolveFromDist("tool", "app", item.entry);
      const indexPath = path.join(toolDir, "index.html");

      expect(fs.existsSync(toolDir), `${item.name} missing directory: ${toolDir}`).toBe(true);
      expect(fs.existsSync(indexPath), `${item.name} missing index.html: ${indexPath}`).toBe(true);
    });
  });

  it("all referenced local assets in tool entry pages exist", () => {
    items.forEach((item) => {
      if (!item.entry) return;

      const indexPath = resolveFromDist("tool", "app", item.entry, "index.html");
      const assetPaths = collectLocalAssetPaths(indexPath);

      assetPaths.forEach((assetPath) => {
        expect(fs.existsSync(assetPath), `${item.name} references missing asset: ${assetPath}`).toBe(true);
      });
    });
  });
});
