import { describe, expect, it } from "vitest";

import { walkFiles } from "../helpers/fs-collect";
import { resolveFromDist } from "../helpers/paths";
import { assertPythonSyntax } from "../helpers/syntax";

describe("all tool Python files", () => {
  const pythonFiles = walkFiles(resolveFromDist("tool", "app"), [".py"]);

  it("have valid syntax", () => {
    expect(() => assertPythonSyntax(pythonFiles)).not.toThrow();
  });
});
