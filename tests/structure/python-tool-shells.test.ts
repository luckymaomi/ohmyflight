import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { collectScriptReferences } from "../helpers/html";
import { resolveFromDist, resolveFromPublic, resolveFromRoot } from "../helpers/paths";

const pythonShellTools = [
  "file-batch-tool",
  "flight-stats-helper",
  "lock-entry-helper",
  "oa-read-helper",
  "seasonal-learning-check-test"
];

describe("python tool TypeScript shells", () => {
  it("keeps a dedicated TypeScript shell source for every Python tool page", () => {
    pythonShellTools.forEach((toolName) => {
      const sourcePath = resolveFromRoot("src", "tool", "app", toolName, "shell.ts");
      expect(fs.existsSync(sourcePath), `missing TS shell source for ${toolName}`).toBe(true);
    });
  });

  it("loads the per-tool shell runtime from each Python tool html page", () => {
    pythonShellTools.forEach((toolName) => {
      const htmlPath = resolveFromPublic("tool", "app", toolName, "index.html");
      const scripts = collectScriptReferences(htmlPath);
      const shellRef = scripts.find((script) => path.basename(script.src) === "shell.js");

      expect(shellRef, `missing shell.js reference in ${toolName}/index.html`).toBeTruthy();
      expect(
        fs.existsSync(resolveFromDist("tool", "app", toolName, "shell.js")),
        `missing built shell.js for ${toolName}`
      ).toBe(true);
    });
  });

  it("does not keep handwritten Python tool business JavaScript under public", () => {
    pythonShellTools.forEach((toolName) => {
      const publicToolDir = resolveFromPublic("tool", "app", toolName);
      const publicJsFiles = fs.readdirSync(publicToolDir).filter((fileName) => fileName.endsWith(".js"));

      expect(publicJsFiles, `unexpected public JS duplicates for ${toolName}`).toEqual([]);
    });
  });
});
