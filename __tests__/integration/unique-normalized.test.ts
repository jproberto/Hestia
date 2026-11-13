import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getRawClient, resetDatabase } from "./supabase";

// ---------------------------------------------------------------------------
// T2 RED — Pluto 11 (Categorias e Contas sem Distinção de Caixa e Acentos).
// Fontes: `tasks.json` T2 (acceptanceCriteria 7), `spec.md` §5 R5 e §6 (migração
// 0019) + `plan.md` §"Migrações" (prova da trava) e §"Testes" (linha
// integração: "trava real: insert bruto de variante no mesmo tipo é
// rejeitado; mesma grafia em tipos diferentes é aceita").
//
// Inserts BRUTOS via client cru (fora do repositório) para provar o índice
// único de (nome normalizado, type) criado pela migração 0019:
//  - variante (caixa/acentos) no MESMO tipo é REJEITADA nas duas tabelas;
//  - a MESMA grafia em tipos diferentes é ACEITA (homônimas permitidas —
//    justamente o caso que a trava antiga global de nome impedia).
//
// Roda só no CI (`npm run test:integration`, job `integration`) com a migração
// 0019 já aplicada. FORA do CI a execução falha APENAS por requiredEnv
// (SUPABASE_INTEGRATION_URL ausente) — resultado esperado localmente.
// ---------------------------------------------------------------------------

const EMAIL = "integration@hestia.com";

async function insertCategory(name: string, type: "receita" | "despesa") {
  const { error } = await getRawClient()
    .from("categories")
    .insert({ name, type, created_by: EMAIL });
  return error;
}

async function insertAccount(name: string, type: "conta" | "cartao") {
  const { error } = await getRawClient()
    .from("financial_accounts")
    .insert({ name, type, created_by: EMAIL });
  return error;
}

beforeAll(() => {
  // requiredEnv — falha alto com a mensagem de variável ausente fora do CI.
  getRawClient();
});

afterAll(async () => {
  await resetDatabase();
});

describe("trava (nome normalizado, tipo) — migração 0019", () => {
  it("rejeita insert bruto de variante de caixa no mesmo tipo (categories)", async () => {
    await resetDatabase();

    expect(await insertCategory("Mercaria", "despesa")).toBeNull();
    const variante = await insertCategory("mercaria", "despesa");
    expect(variante).not.toBeNull();
  });

  it("rejeita insert bruto de variante de acento no mesmo tipo (categories)", async () => {
    await resetDatabase();

    expect(await insertCategory("Alimentação", "despesa")).toBeNull();
    const variante = await insertCategory("alimentacao", "despesa");
    expect(variante).not.toBeNull();
  });

  it("aceita a mesma grafia de categoria em tipos diferentes", async () => {
    await resetDatabase();

    expect(await insertCategory("Mercado", "receita")).toBeNull();
    expect(await insertCategory("Mercado", "despesa")).toBeNull();
  });

  it("rejeita variante no mesmo tipo e aceita mesma grafia em conta e cartao (financial_accounts)", async () => {
    await resetDatabase();

    expect(await insertAccount("Itaú", "conta")).toBeNull();
    const variante = await insertAccount("itau", "conta");
    expect(variante).not.toBeNull();

    expect(await insertAccount("Nubank", "conta")).toBeNull();
    expect(await insertAccount("Nubank", "cartao")).toBeNull();
  });
});
