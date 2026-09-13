// Mílon Module - Public API

// Types (fonte única)
export * from "./types";

// Repositories (Data Access Layer)
export * from "./repositories/exercises";

// DB barrels (caminho oficial da UI): importar via caminho direto
// `@/lib/milon/db/exercises` — nunca re-exportado aqui.

// Hooks (React Data Fetching Layer)
export * from "./hooks/useExercises";

// Utils (regras puras)
export * from "./utils";
