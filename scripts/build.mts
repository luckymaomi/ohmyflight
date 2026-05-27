import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const staticRoot = path.join(projectRoot, "public");
const distRoot = path.join(projectRoot, "dist");
const sourceArchiveScript = path.join(projectRoot, "package_site_source.py");
const execFileAsync = promisify(execFile);

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

async function walkSourceAssetFiles(rootDir) {
  const results = [];
  const assetExtensions = new Set([".py"]);

  async function visit(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }

      if (entry.isFile() && assetExtensions.has(path.extname(entry.name).toLowerCase())) {
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

function toAssetOutputPath(sourceFilePath) {
  const relativePath = path.relative(sourceRoot, sourceFilePath);
  return path.join(distRoot, relativePath);
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

async function readGitText(args) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: projectRoot,
      encoding: "utf8"
    });
    return stdout.trim();
  } catch {
    return "";
  }
}

async function generateVersionFile() {
  const commit = await readGitText(["rev-parse", "--short", "HEAD"]);
  const branch = await readGitText(["branch", "--show-current"]);
  const rawLog = await readGitText(["log", "-5", "--pretty=format:%h%x09%s"]);
  const commits = rawLog
    ? rawLog.split(/\r?\n/).map((line) => {
        const [hash = "", ...messageParts] = line.split("\t");
        return {
          hash,
          message: messageParts.join("\t")
        };
      }).filter((item) => item.hash || item.message)
    : [];

  const version = {
    commit,
    branch,
    builtAt: new Date().toISOString(),
    commits
  };

  await fs.writeFile(
    path.join(distRoot, "version.json"),
    `${JSON.stringify(version, null, 2)}\n`,
    "utf8"
  );
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

async function copySourceAsset(sourceFilePath) {
  const outputFilePath = toAssetOutputPath(sourceFilePath);
  await fs.mkdir(path.dirname(outputFilePath), { recursive: true });
  await fs.copyFile(sourceFilePath, outputFilePath);
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

  const assetFiles = await walkSourceAssetFiles(sourceRoot);
  for (const sourceFilePath of assetFiles) {
    emittedFiles.push(await copySourceAsset(sourceFilePath));
  }

  await generateVersionFile();

  process.stdout.write(`Built ${emittedFiles.length} scripts into dist/\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
});
