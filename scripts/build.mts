import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const staticRoot = path.join(projectRoot, "public");
const distRoot = path.join(projectRoot, "dist");
const sourceArchiveScript = path.join(projectRoot, "package_site_source.py");

async function walkTypeScriptFiles(rootDir) {
  const results = [];

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        results.push(fullPath);
      }
    }
  }

  await visit(rootDir);
  return results.sort();
}

function toOutputPath(sourceFilePath) {
  const relativePath = path.relative(sourceRoot, sourceFilePath);
  return path.join(distRoot, relativePath.replace(/\.ts$/i, ".js"));
}

async function prepareDist() {
  await fs.rm(distRoot, { recursive: true, force: true });
  await fs.mkdir(distRoot, { recursive: true });
}

async function copyStaticFiles() {
  await fs.cp(staticRoot, distRoot, {
    recursive: true,
    force: true
  });
}

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function packageSourceArchive() {
  const candidates = [
    ["python", [sourceArchiveScript]],
    ["python3", [sourceArchiveScript]]
  ];

  for (const [command, args] of candidates) {
    try {
      await runCommand(command, args);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const missingCommand = /ENOENT/i.test(message) || /not recognized/i.test(message);

      if (!missingCommand || command === candidates[candidates.length - 1][0]) {
        throw error;
      }
    }
  }
}

async function emitSourceFile(sourceFilePath) {
  const outputFilePath = toOutputPath(sourceFilePath);
  const sourceText = await fs.readFile(sourceFilePath, "utf8");
  const result = ts.transpileModule(sourceText, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      newLine: ts.NewLineKind.LineFeed,
      removeComments: false
    },
    fileName: sourceFilePath
  });

  await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
  await fs.writeFile(outputFilePath, result.outputText, "utf8");
  return path.relative(projectRoot, outputFilePath);
}

async function main() {
  await packageSourceArchive();
  await prepareDist();
  await copyStaticFiles();

  const sourceFiles = await walkTypeScriptFiles(sourceRoot);

  if (!sourceFiles.length) {
    throw new Error("src/ 下没有可构建的 TypeScript 文件。");
  }

  const emittedFiles = [];
  for (const sourceFilePath of sourceFiles) {
    emittedFiles.push(await emitSourceFile(sourceFilePath));
  }

  process.stdout.write(`Built ${emittedFiles.length} scripts into dist/\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
