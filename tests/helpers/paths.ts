import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const projectRoot = path.resolve(__dirname, "..", "..");

export function resolveFromRoot(...segments) {
  return path.join(projectRoot, ...segments);
}

export function resolveFromPublic(...segments) {
  return path.join(projectRoot, "public", ...segments);
}

export function resolveFromDist(...segments) {
  return path.join(projectRoot, "dist", ...segments);
}
