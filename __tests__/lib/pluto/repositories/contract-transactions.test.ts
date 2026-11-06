import { describe, it, expect, beforeEach } from "vitest";
import type { ITransactionRepository } from "@/lib/pluto/repositories/interfaces";
import type {
  Account,
  Category,
  MonthlyPeriod,
  TransactionInput,
  TransactionWithDetails,
} from "@/lib/pluto/types";
import { FakeTransactionRepository } from "@/lib/pluto/repositories/fakes";

/**
 * Contrato de ITransactionRepository — feature pluto/05e (Lançamento com Data Livre).
 *
 * Fonte do contrato (T2): tasks.json (6 acceptanceCriteria) + plan.md §Contratos
 * Completos + spec.md §§4/5/8. O mês de cálculo (period_year + period_month) é o
 * dado que a trava de "mês aberto" avalia em criar/editar/excluir e por qual a
 * lista do mês filtra; a coluna `date` vira apenas atributo de exibição e
 * ordenação (data livre — decisão D3).
 *
 * Contra o fake/repositório ATUAL (contrato velho: filtro por intervalo de `date`,
 * validação de mês aberto pela data, update sem noção de período) estes casos
 * devem falhar por comportamento (RED) — nunca por SyntaxError/TS2.
 */

/** Entrada de criação com o mês de cálculo (plan.md T3: TransactionInput + período). */
export type PeriodicTransactionInput = TransactionInput & {
  period_year: number;
  period_month: number;
};

/** Registro com o mês de cálculo gravado (plan.md T3: TransactionWithDetails + período). */
export type PeriodicTransaction = TransactionWithDetails & {
  period_year: number;
  period_month: number;
};

/**
 * Campos editáveis na edição — sem campos de período (plan.md T3:
 * TransactionUpdateInput; a edição nunca move o lançamento de mês — decisão D6).
 * Estrutura local para o teste compilar também contra a assinatura antiga
 * `updateTransaction(id, TransactionInput)` enquanto o contrato velho vigorar.
 */
export interface EditableTransactionFields {
  description: string;
  amount: number;
  type: "receita" | "despesa";
  is_refund: boolean;
  date: string;
  category_id: string;
  account_id: string;
}

export interface TransactionContractSeed {
  categories: Category[];
  accounts: Account[];
  monthlyPeriods: MonthlyPeriod[];
  /** Lançamentos plantados diretamente com mês de cálculo (bypassa a validação de criar). */
  transactions?: PeriodicTransaction[];
}

export interface TransactionContractBuild {
  repo: ITransactionRepository;
  seed(data: TransactionContractSeed): void;
  reset(): void;
}

/**
 * Shared contract for ITransactionRepository implementations.
 * Any implementation (in-memory fake today, Supabase-backed tomorrow)
 * must satisfy these behavioral assertions.
 */
export function defineTransactionRepositoryContract(
  label: string,
  build: () => TransactionContractBuild
) {
  describe(`ITransactionRepository contract: ${label}`, () => {
    const EMAIL = "contrato@hestia.com";
    let ctx: TransactionContractBuild;

    /**
     * Períodos do cenário:
     * - 2026/2, 2026/3 e 2026/4 ABERTOS — 2026/4 aberto de propósito: um lançamento
     *   de mês de cálculo 2026/3 com data em abril não pode vazar para abril
     *   mesmo com abril aberto (spec cenário 2);
     * - 2026/5 ENCERRADO — a trava nova deve rejeitar citando 5/2026;
     * - 2026/6 não existe (período inexistente).
     */
    const baseSeed = (): TransactionContractSeed => ({
      categories: [
        { id: "cat-1", name: "Alimentação", type: "despesa", created_at: "2026-01-01T00:00:00Z", created_by: EMAIL },
      ],
      accounts: [
        { id: "acc-1", name: "Itaú", type: "conta", created_at: null, created_by: null },
      ],
      monthlyPeriods: [
        { id: "per-2026-2", year: 2026, month: 2, status: "aberto", created_at: "2026-02-01T00:00:00Z", created_by: EMAIL },
        { id: "per-2026-3", year: 2026, month: 3, status: "aberto", created_at: "2026-03-01T00:00:00Z", created_by: EMAIL },
        { id: "per-2026-4", year: 2026, month: 4, status: "aberto", created_at: "2026-04-01T00:00:00Z", created_by: EMAIL },
        { id: "per-2026-5", year: 2026, month: 5, status: "encerrado", created_at: "2026-05-01T00:00:00Z", created_by: EMAIL },
      ],
    });

    /** Mês de cálculo padrão: 2026/3 (aberto); data padrão dentro de março. */
    const baseInput: PeriodicTransactionInput = {
      description: "Supermercado",
      amount: 150,
      type: "despesa",
      is_refund: false,
      date: "2026-03-15",
      category_id: "cat-1",
      account_id: "acc-1",
      period_year: 2026,
      period_month: 3,
    };

    const input = (overrides: Partial<PeriodicTransactionInput>): PeriodicTransactionInput => ({
      ...baseInput,
      ...overrides,
    });

    /** Payload de edição sem campos de período (TransactionUpdateInput — plan.md T3). */
    const edit = (overrides: Partial<EditableTransactionFields> = {}): EditableTransactionFields => ({
      description: baseInput.description,
      amount: baseInput.amount,
      type: baseInput.type,
      is_refund: baseInput.is_refund,
      date: baseInput.date,
      category_id: baseInput.category_id,
      account_id: baseInput.account_id,
      ...overrides,
    });

    /**
     * Lançamento plantado com mês de cálculo 2026/5 (encerrado) e data em março
     * (mês aberto): sob o contrato velho a validação olharia a data e deixaria
     * passar; sob o novo, a trava rejeita citando 5/2026.
     */
    const closedPeriodTx = (): PeriodicTransaction => ({
      id: "tx-periodo-encerrado",
      description: "Lançamento de mês de cálculo encerrado",
      amount: 99.9,
      type: "despesa",
      is_refund: false,
      date: "2026-03-15",
      category_id: "cat-1",
      account_id: "acc-1",
      created_at: "2026-05-01T00:00:00Z",
      created_by: EMAIL,
      category_name: "Alimentação",
      account_name: "Itaú",
      period_year: 2026,
      period_month: 5,
    });

    beforeEach(() => {
      ctx = build();
      ctx.reset();
      ctx.seed(baseSeed());
    });

    it("create + getByMonth roundtrip preserva campos, grava o mês de cálculo e enriquece nomes", async () => {
      const created = await ctx.repo.createTransaction(baseInput, EMAIL);
      expect(created.id).toBeTruthy();
      expect(created.description).toBe("Supermercado");
      expect(created.category_name).toBe("Alimentação");
      expect(created.account_name).toBe("Itaú");

      const persisted = created as PeriodicTransaction;
      expect(persisted.period_year).toBe(2026);
      expect(persisted.period_month).toBe(3);

      const txs = await ctx.repo.getTransactionsByMonth(2026, 3);
      expect(txs).toHaveLength(1);
      expect(txs[0].id).toBe(created.id);
    });

    it("critério 1: período 2026/3 com data 2026-04-10 aparece em getTransactionsByMonth(2026, 3) e NÃO em (2026, 4)", async () => {
      const created = await ctx.repo.createTransaction(input({ date: "2026-04-10" }), EMAIL);

      const march = await ctx.repo.getTransactionsByMonth(2026, 3);
      const april = await ctx.repo.getTransactionsByMonth(2026, 4);

      expect(march.map((t) => t.id)).toContain(created.id);
      expect(april.map((t) => t.id)).not.toContain(created.id);
    });

    it("critério 2: aceita create com data de período encerrado quando o mês de cálculo está aberto", async () => {
      const created = await ctx.repo.createTransaction(input({ date: "2026-05-10" }), EMAIL);

      const persisted = created as PeriodicTransaction;
      expect(persisted.period_year).toBe(2026);
      expect(persisted.period_month).toBe(3);
    });

    it("critério 3: update que muda a data para outro mês preserva period_year/period_month originais", async () => {
      const created = await ctx.repo.createTransaction(baseInput, EMAIL);

      const updated = await ctx.repo.updateTransaction(
        created.id,
        edit({ date: "2026-04-20" })
      );

      expect(updated.date).toBe("2026-04-20");
      const persisted = updated as PeriodicTransaction;
      expect(persisted.period_year).toBe(2026);
      expect(persisted.period_month).toBe(3);
    });

    it("critério 4 (criar): rejeição usa a mensagem atual referenciando o mês de cálculo", async () => {
      const attempt = ctx.repo.createTransaction(
        input({ period_month: 5, date: "2026-03-15" }),
        EMAIL
      );
      await expect(attempt).rejects.toThrow(/não está aberto/);
      await expect(attempt).rejects.toThrow(/5\/2026/);
    });

    it("critério 4 (editar): rejeição usa a mensagem atual referenciando o mês de cálculo gravado", async () => {
      ctx.seed({ ...baseSeed(), transactions: [closedPeriodTx()] });

      const attempt = ctx.repo.updateTransaction(
        "tx-periodo-encerrado",
        edit({ description: "Editado" })
      );
      await expect(attempt).rejects.toThrow(/não está aberto/);
      await expect(attempt).rejects.toThrow(/5\/2026/);
    });

    it("critério 4 (excluir): rejeição usa a mensagem atual referenciando o mês de cálculo gravado", async () => {
      ctx.seed({ ...baseSeed(), transactions: [closedPeriodTx()] });

      const attempt = ctx.repo.deleteTransaction("tx-periodo-encerrado");
      await expect(attempt).rejects.toThrow(/não está aberto/);
      await expect(attempt).rejects.toThrow(/5\/2026/);

      // a rejeição não remove o lançamento
      expect(await ctx.repo.getTransactionsByMonth(2026, 5)).toHaveLength(1);
    });

    it("critério 5: ordena por data crescente com desempate por id, com datas de meses diferentes convivendo", async () => {
      await ctx.repo.createTransaction(input({ description: "Fatura", date: "2026-04-10" }), EMAIL);
      await ctx.repo.createTransaction(input({ description: "Antigo A", date: "2026-02-28" }), EMAIL);
      await ctx.repo.createTransaction(input({ description: "Antigo B", date: "2026-02-28" }), EMAIL);

      const txs = await ctx.repo.getTransactionsByMonth(2026, 3);
      expect(txs).toHaveLength(3);
      expect(txs[0].date).toBe("2026-02-28");
      expect(txs[2].date).toBe("2026-04-10");
      for (let i = 1; i < txs.length; i++) {
        expect(txs[i].date.localeCompare(txs[i - 1].date)).toBeGreaterThanOrEqual(0);
        if (txs[i].date === txs[i - 1].date) {
          expect(txs[i].id.localeCompare(txs[i - 1].id)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("rejeita create quando o mês de cálculo não existe", async () => {
      const attempt = ctx.repo.createTransaction(
        input({ period_month: 6, date: "2026-03-15" }),
        EMAIL
      );
      await expect(attempt).rejects.toThrow(/não está aberto/);
      await expect(attempt).rejects.toThrow(/6\/2026/);
    });

    it("update altera campos em período aberto sem tocar no mês de cálculo", async () => {
      const created = await ctx.repo.createTransaction(baseInput, EMAIL);
      const updated = await ctx.repo.updateTransaction(
        created.id,
        edit({ description: "Supermercado Editado", amount: 200 })
      );
      expect(updated.description).toBe("Supermercado Editado");
      expect(updated.amount).toBe(200);
    });

    it("delete remove; delete de id inexistente rejeita", async () => {
      const created = await ctx.repo.createTransaction(baseInput, EMAIL);
      await ctx.repo.deleteTransaction(created.id);
      expect(await ctx.repo.getTransactionsByMonth(2026, 3)).toHaveLength(0);

      await expect(ctx.repo.deleteTransaction("inexistente")).rejects.toThrow();
    });
  });
}

defineTransactionRepositoryContract("FakeTransactionRepository", () => {
  const repo = new FakeTransactionRepository();
  return {
    repo,
    reset: () => repo.reset(),
    seed: (data: TransactionContractSeed) => repo.seed(data),
  };
});
