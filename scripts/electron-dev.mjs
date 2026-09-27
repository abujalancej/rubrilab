import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.RUBRILAB_PORT ?? 3000);
const url = `http://localhost:${port}/`;
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const electron = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
const cleanEnv = { ...process.env };
delete cleanEnv.ELECTRON_RUN_AS_NODE;

let webProcess;
let electronProcess;

async function isReady() {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForWeb() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await isReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The web app did not start at ${url}`);
}

function stop() {
  webProcess?.kill("SIGTERM");
  electronProcess?.kill("SIGTERM");
}

process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});

if (!(await isReady())) {
  webProcess = spawn(npm, ["run", "dev"], {
    cwd: root,
    env: { ...cleanEnv, RUBRILAB_PORT: String(port) },
    stdio: "inherit",
  });
}

await waitForWeb();
console.log(`Opening RubriLab in Electron at ${url}`);
electronProcess = spawn(electron, [path.join(root, "electron", "main.mjs"), `--dev-url=${url}`], {
  cwd: root,
  env: { ...cleanEnv, ELECTRON_START_URL: url },
  stdio: "inherit",
});

electronProcess.on("exit", (code) => {
  stop();
  process.exit(code ?? 0);
});
