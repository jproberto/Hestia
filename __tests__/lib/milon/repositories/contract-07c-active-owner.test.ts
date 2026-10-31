// Contrato RED — Mílon 07c Troca com execução ativa (TASK-001).
// Fonte: `.agents/modules/milon/07c-troca-execucao-ativa/spec.md` R1 (máximo 1
// aberta por dono, global) + R2 (bloqueio de escrita) + EC3 (corrida: erro de
// unique constraint → UI trata como "já existe execução ativa", spec.md:152) +
// `plan.md` §3 (contrato textual, plan.md:63 — leitura por dono com ordenação
// início desc + id desc; início recusa treino distinto com texto de corrida;
// idempotente no mesmo treino; unicidade remapeada; standalone nova com sufixo
// Standalone) + `tasks.json` TASK-001.
// Contrato fakes-only (decisão 57): só o fake em memória é exercitado; o
// repository real é verificado por tsc (mesmas assinaturas) e pelas cadeias de
// query em `db/*.test.ts` na TASK-002.
// Estado vigente citado (verdade para o RED):
// - `lib/milon/repositories/interfaces.ts:107-130` — IWorkoutExecutionRepository
//   NÃO declara findOpenExecutionByOwner.
// - `lib/milon/repositories/fakes/fakeWorkoutExecutionRepository.ts:45-76` —
//   fake só conhece findOpenExecutionByWorkout + startExecution idempotente por
//   treino (treinos distintos ganham execuções distintas, sem recusa por dono).
// - `lib/milon/repositories/executions.ts:50-94` — real só lê por treino e abre
//   idempotente por treino, sem pré-cheque por dono.
// Escrito ANTES da implementação (outside-in). Expected: FAIL —
// `findOpenExecutionByOwner` inexistente no fake/repository (TypeError em
// runtime + tsc cita o nome) e `startExecution` em treino distinto resolve em
// vez de recusar (motivos certos, nunca sintaxe). Hefesto fará GREEN na
// TASK-002 sem mudar estes testes.
// Convenção de texto: plan.md:63/79 fala em "texto de corrida congelado" mas
// NÃO congela o literal completo; este contrato NÃO inventa frase — a recusa é
// verificada pelo fragmento congelado da spec EC3 ("já existe execução ativa",
// spec.md:152) via regex /execu.*ativa/i. O literal completo será congelado na
// TASK-002 sem parafrasear os demais textos (tooltip AC1, arquivar AC5, ativar
// AC9, remover AC10 — fora deste contrato).
import { describe, it, expect } from "vitest";
import type { IWorkoutExecutionRepository } from "@/lib/milon/repositories/interfaces";
import { createFakeWorkoutExecutionRepository } from "@/lib/milon/repositories/fakes/fakeWorkoutExecutionRepository";
import * as ExecutionsRepo from "@/lib/milon/repositories/executions";
import type { WorkoutExecution } from "@/lib/milon/types";

const EMAIL = "contrato-07c@hestia.lan";
const OUTRO_DONO = "outro-dono@hestia.lan";
const PROGRAM_A = "prog-07c-a";
const TREINO_A = "w-07c-a";
const TREINO_B = "w-07c-b";

// Fragmento congelado da spec EC3 (spec.md:152) — único texto de corrida com
// fonte literal. O literal completo da recusa será congelado na TASK-002.
const FRAGMENTO_CORRIDA = /execu.*ativa/i;

function execucao(
  id: string,
  workoutId: string,
  startedAt: string,
  owner: string = EMAIL,
  finishedAt: string | null = null,
): WorkoutExecution {
  return {
    id,
    workoutId,
    programId: PROGRAM_A,
    startedAt,
    finishedAt,
    createdAt: startedAt,
    created_by: owner,
  };
}

function repoCom(seed: WorkoutExecution[]): IWorkoutExecutionRepository {
  return createFakeWorkoutExecutionRepository({ executions: seed });
}

describe("Milon 07c TASK-001 RED — findOpenExecutionByOwner (R1, plan §3)", () => {
  it("devolve a execução aberta do dono (finished_at nulo)", async () => {
    const repo = repoCom([execucao("exec-a", TREINO_A, "2026-10-14T10:00:00.000Z")]);

    const aberta = await repo.findOpenExecutionByOwner(EMAIL);

    expect(aberta).toMatchObject({ id: "exec-a", workoutId: TREINO_A, finishedAt: null });
  });

  it("devolve null quando o dono não tem execução aberta (só selada ou vazio)", async () => {
    const repo = repoCom([
      execucao("exec-sel", TREINO_A, "2026-10-13T10:00:00.000Z", EMAIL, "2026-10-13T11:00:00.000Z"),
    ]);

    await expect(repo.findOpenExecutionByOwner(EMAIL)).resolves.toBeNull();
    await expect(repoCom([]).findOpenExecutionByOwner(EMAIL)).resolves.toBeNull();
  });

  it("ordena por início desc com desempate por id desc (legado pré-0016 com 2 abertas)", async () => {
    const repo = repoCom([
      execucao("exec-antiga", TREINO_A, "2026-10-14T09:00:00.000Z"),
      execucao("exec-nova", TREINO_B, "2026-10-14T10:00:00.000Z"),
    ]);

    const aberta = await repo.findOpenExecutionByOwner(EMAIL);

    expect(aberta?.id).toBe("exec-nova");
  });

  it("desempata início igual por id desc", async () => {
    const instante = "2026-10-14T10:00:00.000Z";
    const repo = repoCom([
      execucao("exec-a", TREINO_A, instante),
      execucao("exec-b", TREINO_B, instante),
    ]);

    const aberta = await repo.findOpenExecutionByOwner(EMAIL);

    expect(aberta?.id).toBe("exec-b");
  });

  it("ignora execução aberta de outro dono (invariante é por dono, não global)", async () => {
    const repo = repoCom([
      execucao("exec-outro", TREINO_A, "2026-10-14T10:00:00.000Z", OUTRO_DONO),
    ]);

    await expect(repo.findOpenExecutionByOwner(EMAIL)).resolves.toBeNull();
    await expect(repo.findOpenExecutionByOwner(OUTRO_DONO)).resolves.toMatchObject({
      id: "exec-outro",
    });
  });

  it("ignora execução selada do próprio dono (só aberta conta)", async () => {
    const repo = repoCom([
      execucao("exec-sel", TREINO_A, "2026-10-13T10:00:00.000Z", EMAIL, "2026-10-13T11:00:00.000Z"),
      execucao("exec-aberta", TREINO_B, "2026-10-14T10:00:00.000Z", EMAIL, null),
    ]);

    const aberta = await repo.findOpenExecutionByOwner(EMAIL);

    expect(aberta).toMatchObject({ id: "exec-aberta", finishedAt: null });
  });
});

describe("Milon 07c TASK-001 RED — startExecution recusa treino distinto (R1/EC3, plan §3)", () => {
  it("recusa abertura em treino distinto com texto de corrida quando o dono já tem aberta", async () => {
    const repo = repoCom([execucao("exec-a", TREINO_A, "2026-10-14T10:00:00.000Z")]);

    await expect(repo.startExecution(TREINO_B, PROGRAM_A, EMAIL)).rejects.toThrow(
      FRAGMENTO_CORRIDA,
    );
  });

  it("não escreve a segunda execução ao recusar (aberta original intacta)", async () => {
    const repo = repoCom([execucao("exec-a", TREINO_A, "2026-10-14T10:00:00.000Z")]);

    await expect(repo.startExecution(TREINO_B, PROGRAM_A, EMAIL)).rejects.toThrow(
      FRAGMENTO_CORRIDA,
    );

    await expect(repo.findOpenExecutionByOwner(EMAIL)).resolves.toMatchObject({
      id: "exec-a",
      workoutId: TREINO_A,
    });
  });

  it("início idempotente devolve a existente do MESMO treino sem trocar o início", async () => {
    const repo = repoCom([execucao("exec-a", TREINO_A, "2026-10-14T10:00:00.000Z")]);

    const segunda = await repo.startExecution(TREINO_A, PROGRAM_A, EMAIL);

    expect(segunda.id).toBe("exec-a");
    expect(segunda.startedAt).toBe("2026-10-14T10:00:00.000Z");
  });

  it("violação de unicidade por dono é remapeada para o texto de corrida (não devolve execução alheia)", async () => {
    // Caminho de corrida EC3: pré-cheque passou em dois dispositivos e o banco
    // barrou o segundo insert. No fake, o pré-cheque por dono já recusa antes
    // de inserir — o observável é o mesmo: erro com o fragmento de corrida e
    // nenhuma execução nova no treino perdedor.
    const repo = repoCom([execucao("exec-a", TREINO_A, "2026-10-14T10:00:00.000Z")]);

    await expect(repo.startExecution(TREINO_B, PROGRAM_A, EMAIL)).rejects.toThrow(
      FRAGMENTO_CORRIDA,
    );

    await expect(repo.findOpenExecutionByOwner(EMAIL)).resolves.toMatchObject({
      id: "exec-a",
    });
  });
});

describe("Milon 07c TASK-001 RED — exports do repository real (plan §3)", () => {
  it("executions.ts expõe findOpenExecutionByOwner + standalone com o mesmo nome + sufixo Standalone", () => {
    const mod = ExecutionsRepo as unknown as Record<string, unknown>;
    expect(typeof mod.findOpenExecutionByOwner).toBe("function");
    expect(typeof mod.findOpenExecutionByOwnerStandalone).toBe("function");
  });
});
