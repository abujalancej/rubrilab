import { app, BrowserWindow, dialog, shell } from "electron";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = app.isPackaged ? path.join(process.resourcesPath, "app") : path.join(__dirname, "..");
const productionPort = Number(process.env.RUBRILAB_ELECTRON_PORT ?? 31230);
const requestedDevUrl = process.argv.find((argument) => argument.startsWith("--dev-url="))?.slice("--dev-url=".length);
const iconPath = path.join(appRoot, ...(app.isPackaged ? ["dist", "client"] : ["public"]), "rubrilab-icon-transparent.png");
const cleanEnv = { ...process.env };
delete cleanEnv.ELECTRON_RUN_AS_NODE;

let serverProcess;

function localUrl() {
  return `http://127.0.0.1:${productionPort}/`;
}

function startProductionServer() {
  const vinextCli = path.join(appRoot, "node_modules", "vinext", "dist", "cli.js");
  serverProcess = spawn(process.execPath, [vinextCli,
    "start",
    "--port",
    String(productionPort),
    "--hostname",
    "127.0.0.1",
  ], {
    cwd: appRoot,
    env: { ...cleanEnv, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production", PORT: String(productionPort) },
    stdio: "inherit",
  });
  serverProcess.on("error", (error) => {
    console.error("Could not start the RubriLab local server.", error);
  });
}

async function waitForServer(url, attempts = 40) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The local server may need a few seconds to boot.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`RubriLab did not start at ${url}`);
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#f2f6ff",
    title: "RubriLab",
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("mailto:")) void shell.openExternal(url);
    return { action: "deny" };
  });

  const url = requestedDevUrl ?? process.env.ELECTRON_START_URL ?? (app.isPackaged ? localUrl() : "http://localhost:3000/");
  if (app.isPackaged && !requestedDevUrl && !process.env.ELECTRON_START_URL) {
    startProductionServer();
    await waitForServer(url);
  }
  await window.loadURL(url);
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error(error);
    await dialog.showMessageBox({
      type: "error",
      title: "RubriLab no se ha podido iniciar",
      message: error instanceof Error ? error.message : "No se pudo abrir la aplicación.",
    });
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("before-quit", () => {
  serverProcess?.kill();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
