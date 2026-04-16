import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { walkFiles } from "../helpers/fs-collect";
import { resolveFromRoot } from "../helpers/paths";

const srcRoot = resolveFromRoot("src");
const publicRoot = resolveFromRoot("public");
const distRoot = resolveFromRoot("dist");

describe("final delivery structure", () => {
  it("keeps source responsibilities separated between src and public", () => {
    expect(fs.existsSync(srcRoot)).toBe(true);
    expect(fs.existsSync(publicRoot)).toBe(true);
  });

  it("uses dist as the only formal runtime delivery tree", () => {
    expect(fs.existsSync(distRoot)).toBe(true);

    [
      "index.html",
      "assets",
      "home",
      "libs",
      "template",
      "tool"
    ].forEach((entry) => {
      expect(fs.existsSync(resolveFromRoot(entry)), `runtime entry should not stay at root: ${entry}`).toBe(false);
    });
  });

  it("keeps every public file reachable from dist", () => {
    walkFiles(publicRoot, []).forEach((publicFilePath) => {
      const relativePath = path.relative(publicRoot, publicFilePath);
      const distFilePath = path.join(distRoot, relativePath);

      expect(fs.existsSync(distFilePath), `missing dist file: ${relativePath}`).toBe(true);
    });
  });
});
