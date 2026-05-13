import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveFromRoot } from "../helpers/paths";

const checkedRoots = ["src", "public", "spec", "tests"];
const ignoredDirectoryNames = new Set(["dist", "node_modules", ".git"]);

function collectEmptyDirectories(rootDir: string) {
  const results: string[] = [];

  function visit(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    if (!entries.length) {
      results.push(path.relative(resolveFromRoot(), currentPath));
      return;
    }

    entries.forEach((entry) => {
      if (!entry.isDirectory() || ignoredDirectoryNames.has(entry.name)) return;
      visit(path.join(currentPath, entry.name));
    });
  }

  visit(rootDir);
  return results.sort();
}

function collectToolEntries() {
  const source = fs.readFileSync(resolveFromRoot("src", "tool", "tools-data.ts"), "utf8");
  return Array.from(source.matchAll(/entry:\s*['"]([^'"]+)['"]/g), (match) => match[1]).sort();
}

describe("repository structure", () => {
  it("does not keep empty source, public, spec, or test directories", () => {
    const emptyDirectories = checkedRoots.flatMap((rootName) => collectEmptyDirectories(resolveFromRoot(rootName)));

    expect(emptyDirectories, `empty directories:\n${emptyDirectories.join("\n")}`).toEqual([]);
  });

  it("has an index page for every tool entry", () => {
    const missingEntries = collectToolEntries().filter((entry) => {
      return !fs.existsSync(resolveFromRoot("public", "tool", "app", entry, "index.html"));
    });

    expect(missingEntries, `tool entries without index.html:\n${missingEntries.join("\n")}`).toEqual([]);
  });
});
