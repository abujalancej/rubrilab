import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const platformDirectories = {
  darwin: "mac",
  linux: "linux",
  win32: "win",
};
const platformDirectory = platformDirectories[process.platform];

if (!platformDirectory) {
  throw new Error(`Unsupported packaging platform: ${process.platform}`);
}

const electronBuilder = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron-builder.cmd" : "electron-builder",
);
const result = spawnSync(
  electronBuilder,
  [...process.argv.slice(2), `-c.directories.output=out/${platformDirectory}`],
  { cwd: projectRoot, stdio: "inherit" },
);

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
