import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { resolveFromRoot } from "../helpers/paths";

const multiWorkflowToolModules = [
  {
    toolName: "image-tool",
    expectedSourceFiles: [
      "shared.ts",
      "convert.ts",
      "compress.ts",
      "resize.ts",
      "crop.ts",
      "base64.ts",
      "main.ts"
    ]
  },
  {
    toolName: "pdf-tool",
    expectedSourceFiles: [
      "shared.ts",
      "extract.ts",
      "merge.ts",
      "pdf-to-image.ts",
      "image-to-pdf.ts",
      "main.ts"
    ]
  }
];

describe("multi-workflow tool source structure", () => {
  it("keeps tabbed tools split into per-workflow TypeScript files", () => {
    multiWorkflowToolModules.forEach(({ toolName, expectedSourceFiles }) => {
      const toolDir = resolveFromRoot("src", "tool", "app", toolName);

      expectedSourceFiles.forEach((fileName) => {
        expect(
          fs.existsSync(resolveFromRoot("src", "tool", "app", toolName, fileName)),
          `missing ${toolName}/${fileName}`
        ).toBe(true);
      });

      const tsFiles = fs.readdirSync(toolDir).filter((fileName) => fileName.endsWith(".ts") && !fileName.endsWith(".d.ts"));
      expect(tsFiles.length, `${toolName} is still effectively a single-file tool`).toBeGreaterThan(1);
    });
  });
});
