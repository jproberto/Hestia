// Contratos de repositório do módulo Mílon (DIP: consumidos via interfaces).
import type { MilonItem, CreateMilonInput } from "../types";

export interface IMilonRepository {
  list(): Promise<MilonItem[]>;
  create(input: CreateMilonInput): Promise<MilonItem>;
}
