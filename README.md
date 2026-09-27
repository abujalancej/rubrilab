# RubriLab

A local app for organising laboratory sessions, student groups and assessment evidence while teaching.

The application uses a strict TypeScript domain model, Zod validation, repository abstractions, and Dexie-backed IndexedDB persistence. The same renderer can run in the browser or inside the Electron desktop shell without changing teaching workflows.

## Local development

```bash
npm install
npm run dev
```

The first browser launch seeds a fictional 3 ESO B class and an active robotics practical.

## Electron desktop shell

```bash
npm run electron:dev
```

This starts the local RubriLab server and opens it in Electron. To create a local macOS app bundle:

```bash
npm run electron:build
```

The generated app is placed under `release/` and is intentionally ignored by Git. DMG, EXE, and ZIP files use `RubriLab-<version>-<os>-<arch>.<ext>`.
