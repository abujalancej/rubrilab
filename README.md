# RubriLab

Offline-first practical laboratory management and evidence capture for secondary-school teaching.

The application uses a strict TypeScript domain model, Zod validation, repository abstractions, and Dexie-backed IndexedDB persistence. It is designed so browser persistence can later be replaced by SQLite in a Tauri shell without rewriting teaching workflows.

## Local development

```bash
npm install
npm run dev
```

The first browser launch seeds a fictional 3 ESO B class and an active robotics practical.
