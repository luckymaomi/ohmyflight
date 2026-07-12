import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { resolveFromRoot } from "../helpers/paths";

const checkedRoots = ["src", "public", "spec", "tests"];
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

function collectBomFiles() {
  const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
    cwd: resolveFromRoot(),
    encoding: "utf8"
  }).split("\0").filter(Boolean);

  return trackedFiles.filter((relativePath) => {
    if (!textFileExtensions.has(path.extname(relativePath).toLowerCase())) return false;
    const absolutePath = resolveFromRoot(relativePath);
    if (!fs.existsSync(absolutePath)) return false;
    const content = fs.readFileSync(absolutePath);
    return content.length >= 3 && content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf;
  });
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

  it("has developer and user documentation for every tool entry", () => {
    const entries = collectToolEntries();
    const missingDocuments = entries.flatMap((entry) => {
      const expectedPaths = [
        path.join("spec", "dev", entry),
        path.join("spec", "user", entry, "manual.md")
      ];
      return expectedPaths.filter((relativePath) => !fs.existsSync(resolveFromRoot(relativePath)));
    });

    expect(missingDocuments, `missing tool documents:\n${missingDocuments.join("\n")}`).toEqual([]);
  });

  it("stores repository text as UTF-8 without BOM", () => {
    const bomFiles = collectBomFiles().sort();

    expect(bomFiles, `UTF-8 BOM files:\n${bomFiles.join("\n")}`).toEqual([]);
  });
});
