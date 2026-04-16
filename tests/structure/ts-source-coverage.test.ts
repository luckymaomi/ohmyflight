import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { walkFiles } from "../helpers/fs-collect";
import { collectScriptReferences } from "../helpers/html";
import { resolveFromDist, resolveFromPublic, resolveFromRoot } from "../helpers/paths";

const srcRoot = resolveFromRoot("src");
const publicRoot = resolveFromPublic();
const distRoot = resolveFromDist();

describe("TypeScript source to runtime coverage", () => {
  it("emits a runtime JavaScript file for every buildable TypeScript source file", () => {
    const sourceFiles = walkFiles(srcRoot, [".ts"]).filter((filePath) => !filePath.endsWith(".d.ts"));

    sourceFiles.forEach((sourceFilePath) => {
      const relativePath = path.relative(srcRoot, sourceFilePath).replace(/\.ts$/i, ".js");
      const runtimePath = path.join(distRoot, relativePath);

      expect(fs.existsSync(runtimePath), `missing runtime JavaScript output: ${relativePath}`).toBe(true);
    });
  });

  it("does not keep handwritten JavaScript inside src", () => {
    const sourceJsFiles = walkFiles(srcRoot, [".js"]);
    expect(sourceJsFiles).toEqual([]);
  });

  it("does not keep handwritten first-party business JavaScript inside public", () => {
    const publicJsFiles = walkFiles(publicRoot, [".js"]).filter((filePath) => {
      const relativePath = path.relative(publicRoot, filePath).replace(/\\/g, "/");
      return !relativePath.startsWith("libs/");
    });

    expect(publicJsFiles).toEqual([]);
  });

  it("lets public html pages point to dist runtime scripts instead of public business scripts", () => {
    const htmlFiles = walkFiles(publicRoot, [".html"]);

    htmlFiles.forEach((htmlFilePath) => {
      const scriptRefs = collectScriptReferences(htmlFilePath).filter((item) => item.src.endsWith(".js"));

      scriptRefs.forEach((scriptRef) => {
        const relativePublicScriptPath = path.relative(publicRoot, scriptRef.path).replace(/\\/g, "/");
        if (relativePublicScriptPath.startsWith("libs/")) {
          expect(fs.existsSync(scriptRef.path), `missing public lib script: ${relativePublicScriptPath}`).toBe(true);
          return;
        }

        const distScriptPath = path.join(distRoot, path.relative(publicRoot, scriptRef.path));
        expect(fs.existsSync(scriptRef.path), `unexpected public business script: ${relativePublicScriptPath}`).toBe(false);
        expect(fs.existsSync(distScriptPath), `missing dist runtime script: ${relativePublicScriptPath}`).toBe(true);
      });
    });
  });
});
