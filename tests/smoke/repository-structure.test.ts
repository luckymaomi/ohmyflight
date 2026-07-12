import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveFromRoot } from "../helpers/paths";

const checkedRoots = ["src", "public", "spec", "tests"];
const textRoots = ["."];
const ignoredDirectoryNames = new Set(["coverage", "dist", "node_modules", ".git", ".vitest"]);
const textFileExtensions = new Set([
  ".css", ".html", ".js", ".json", ".md", ".mts", ".py", ".svg", ".ts", ".txt", ".yaml", ".yml"
]);

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

function collectBomFiles(rootDir: string) {
  const results: string[] = [];

  function visit(currentPath: string) {
    fs.readdirSync(currentPath, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) visit(entryPath);
        return;
      }
      if (!textFileExtensions.has(path.extname(entry.name).toLowerCase())) return;

      const content = fs.readFileSync(entryPath);
      if (content.length >= 3 && content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf) {
        results.push(path.relative(resolveFromRoot(), entryPath));
      }
    });
  }

  visit(rootDir);
  return results;
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

  it("stores repository text as UTF-8 without BOM", () => {
    const bomFiles = textRoots.flatMap((rootName) => collectBomFiles(resolveFromRoot(rootName))).sort();

    expect(bomFiles, `UTF-8 BOM files:\n${bomFiles.join("\n")}`).toEqual([]);
  });
});
