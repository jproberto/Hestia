// Pluto Module - Public API
// Este é o único ponto de entrada externo para o módulo Pluto

// Types
export * from "./types";

// Repositories (Data Access Layer)
export * from "./repositories/transactions";
export * from "./repositories/checklist";
export * from "./repositories/accounts";
export * from "./repositories/months";
// Categories - explicit exports to avoid conflicts with services
export {
  getCategories,
  getOrCreateCategory,
} from "./repositories/categories";
// Budget repository - explicit exports to avoid conflicts with services
export {
  getBudgetAdjustment,
  initBudget,
  getBudgets,
  addOrUpdateBudgetItem,
  getBudgetAdjustments,
  createBudgetAdjustment,
  // Note: adjustBudgetItem is exported from services/budget
} from "./repositories/budget";

// Services (Business Logic Layer)
export * from "./services/transactions";
export * from "./services/budget";
export * from "./services/checklist";
export * from "./services/accounts";
export * from "./services/categories";

// Hooks (React Data Fetching Layer)
export * from "./hooks/useTransactions";
export * from "./hooks/useBudgets";
export * from "./hooks/useChecklist";
export * from "./hooks/useAccounts";
export * from "./hooks/useCategories";

// Checklist-Budget utilities
export * from "./checklist-budget";