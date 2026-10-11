import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// REMOÇÃO da foto/snapshot (Mílon #5 — RED da remoção, sem tocar em produção)
// Fonte: spec.md alinhada (sem foto; §3 template ao vivo + marcadores de feito
// por série; bloqueio por treino garante escrita única; §4 YAGNI: foto do
// treino e valores reais ficam para o encerrar #7) + delegação Minos:
// (1) ausência de snapshot/frozenEntries/setExecutionSnapshot em código vivo
// (tipos, repository, fake, hook, seção, migração 0012 removida);
// (2) Treino do Dia exibe template ao vivo + feito (edição aparece na hora);
// (3) bloqueio/badge/cancelamento/replicação preservados (travas nos arquivos
// próprios, não aqui); (4) migration-0012.test.ts excluído (0012 nunca aplicada).
//
// Expected: FAIL enquanto o código vivo ainda tem foto (RED da remoção).
// Hefesto fará GREEN removendo a foto sem mudar estes testes.
// ---------------------------------------------------------------------------

function codigoVivo(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, rel), "utf8");
}

describe("Milon 05 — REMOÇÃO da foto/snapshot (RED da remoção)", () => {
  it("migração 0012 removida: arquivo migration-0012-milon-execucao-snapshot.sql não existe (nunca aplicada em nenhum banco)", () => {
    const arquivo = path.resolve(
      __dirname,
      "../../../utils/migrations/migration-0012-milon-execucao-snapshot.sql",
    );
    expect(fs.existsSync(arquivo)).toBe(false);
  });

  it("tipos sem foto: lib/milon/types.ts sem snapshot/frozen", () => {
    const src = codigoVivo("../../../lib/milon/types.ts");
    expect(src).not.toMatch(/snapshot/i);
    expect(src).not.toMatch(/frozen/i);
    expect(src).not.toMatch(/setExecutionSnapshot/);
    expect(src).not.toMatch(/WorkoutExecutionSnapshot/);
    expect(src).not.toMatch(/WorkoutExecutionFrozen/);
  });

  it("repository sem foto: lib/milon/repositories/executions.ts sem setExecutionSnapshot/snapshot", () => {
    const src = codigoVivo("../../../lib/milon/repositories/executions.ts");
    expect(src).not.toMatch(/setExecutionSnapshot/);
    expect(src).not.toMatch(/snapshot/i);
    expect(src).not.toMatch(/frozen/i);
  });

  it("interface sem foto: lib/milon/repositories/interfaces.ts sem setExecutionSnapshot/snapshot", () => {
    const src = codigoVivo("../../../lib/milon/repositories/interfaces.ts");
    expect(src).not.toMatch(/setExecutionSnapshot/);
    expect(src).not.toMatch(/snapshot/i);
    expect(src).not.toMatch(/frozen/i);
  });

  it("fake sem foto: fakeWorkoutExecutionRepository sem setExecutionSnapshot/snapshot", () => {
    const src = codigoVivo(
      "../../../lib/milon/repositories/fakes/fakeWorkoutExecutionRepository.ts",
    );
    expect(src).not.toMatch(/setExecutionSnapshot/);
    expect(src).not.toMatch(/snapshot/i);
    expect(src).not.toMatch(/frozen/i);
  });

  it("hook sem foto: lib/milon/hooks/useWorkoutExecution.ts sem frozenEntries/setExecutionSnapshot/snapshot", () => {
    const src = codigoVivo("../../../lib/milon/hooks/useWorkoutExecution.ts");
    expect(src).not.toMatch(/frozenEntries/);
    expect(src).not.toMatch(/setExecutionSnapshot/);
    expect(src).not.toMatch(/snapshot/i);
    expect(src).not.toMatch(/frozen/i);
  });

  it("seção sem foto: components/milon/WorkoutDetailSection.tsx sem frozenEntries/snapshot/frozen", () => {
    const src = codigoVivo("../../../components/milon/WorkoutDetailSection.tsx");
    expect(src).not.toMatch(/frozenEntries/);
    expect(src).not.toMatch(/snapshot/i);
    expect(src).not.toMatch(/frozen/i);
  });
});
