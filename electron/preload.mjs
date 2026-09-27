import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("rubrilabDesktop", {
  isElectron: true,
  platform: process.platform,
});
