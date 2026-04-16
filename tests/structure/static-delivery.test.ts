import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { walkFiles } from "../helpers/fs-collect";
import { hashFile } from "../helpers/hash";
import { resolveFromDist, resolveFromPublic } from "../helpers/paths";

const publicRoot = resolveFromPublic();
const distRoot = resolveFromDist();

describe("static delivery files", () => {
  const publicFiles = walkFiles(publicRoot, []);

  it("copies every public file into dist", () => {
    publicFiles.forEach((publicFilePath) => {
      const relativePath = path.relative(publicRoot, publicFilePath);
      const distFilePath = path.join(distRoot, relativePath);

      expect(fs.existsSync(distFilePath), `missing dist file: ${relativePath}`).toBe(true);
    });
  });

  it("keeps dist static files byte-identical to public", () => {
    publicFiles.forEach((publicFilePath) => {
      const relativePath = path.relative(publicRoot, publicFilePath);
      const distFilePath = path.join(distRoot, relativePath);

      expect(hashFile(distFilePath), `changed dist file content: ${relativePath}`).toBe(hashFile(publicFilePath));
    });
  });
});
