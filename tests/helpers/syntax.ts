import { execFileSync } from "node:child_process";

export function assertJavaScriptSyntax(filePath: string, preferredMode = "auto"): void {
  const args: string[] = [];
  if (preferredMode === "module") {
    args.push("--experimental-default-type=module");
  }

  execFileSync("node", [...args, "--check", filePath], {
    stdio: "pipe"
  });
}

export function assertPythonSyntax(filePaths: string[]): void {
  if (!filePaths.length) return;

  const script = [
    "import ast, sys, tokenize",
    "for path in sys.argv[1:]:",
    "    with tokenize.open(path) as fh:",
    "        source = fh.read()",
    "    ast.parse(source, filename=path)"
  ].join("\n");

  execFileSync("python", ["-c", script, ...filePaths], {
    stdio: "pipe"
  });
}
