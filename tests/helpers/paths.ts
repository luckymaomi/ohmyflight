import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, "..", "..");

export function resolveFromRoot(...segments: string[]): string {
  return path.join(projectRoot, ...segments);
}

export function resolveFromPublic(...segments: string[]): string {
  return path.join(projectRoot, "public", ...segments);
}

export function resolveFromDist(...segments: string[]): string {
  return path.join(projectRoot, "dist", ...segments);
}
