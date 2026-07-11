import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveFromPublic } from "../helpers/paths";

interface VendorEntry {
  version: string;
  files: string[];
  source: string;
}

interface VendorInventory {
  libraries: Record<string, VendorEntry>;
}

describe("third-party browser library inventory", () => {
  const libraryDirectory = resolveFromPublic("libs");
  const inventory = JSON.parse(
    fs.readFileSync(path.join(libraryDirectory, "versions.json"), "utf8")
  ) as VendorInventory;

  it("covers every managed file exactly once", () => {
    const actualFiles = fs.readdirSync(libraryDirectory)
      .filter((name) => name !== "versions.json")
      .sort();
    const declaredFiles = Object.values(inventory.libraries)
      .flatMap((entry) => entry.files)
      .sort();

    expect(new Set(declaredFiles).size).toBe(declaredFiles.length);
    expect(declaredFiles).toEqual(actualFiles);
  });

  it("records a version and source for every library", () => {
    Object.entries(inventory.libraries).forEach(([name, entry]) => {
      expect(entry.version, `${name} has no version`).toBeTruthy();
      expect(entry.source, `${name} has no source`).toMatch(/^https:\/\//);
      expect(entry.files.length, `${name} has no files`).toBeGreaterThan(0);
    });
  });
});
