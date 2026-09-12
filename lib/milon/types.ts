// Types consolidados do módulo Mílon — FONTE ÚNICA (nunca duplicar tipos).
// Ver Mapa de Camadas no AGENTS.md: Row (banco) / Input (repositório) / domínio.

export interface MilonItemRow {
  id: string;
  name: string;
  created_at: string;
}

export interface MilonItem {
  id: string;
  name: string;
  created_at: string;
}

export interface CreateMilonInput {
  name: string;
}
