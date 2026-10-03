import { describe, it, expect, beforeEach } from "vitest";
import type { IWorkoutRepository } from "@/lib/milon/repositories/interfaces";
import { createFakeWorkoutRepository } from "@/lib/milon/repositories/fakes/fakeWorkoutRepository";
import type { Workout, WorkoutEntry, WorkoutSeries } from "@/lib/milon/types";
import {
  MSG_TREINO_COM_EXERCICIOS,
  MSG_EXERCICIO_JA_NO_TREINO,
  MSG_NOME_TREINO_OBRIGATORIO,
  MSG_NOME_TREINO_DUPLICADO,
} from "@/lib/milon/workout-utils";

// ---------------------------------------------------------------------------
// Contrato RED da TASK-005 (Mílon #3) — consumido pela TASK-006.
// Contrato fakes-only (decisão 57): nenhum teste aqui bate no banco real.
// Só o fake em memória é exercitado; o repository real é verificado por tsc
// (mesmas assinaturas) e pelas cadeias de query em `db/workouts.test.ts`.
//
// Fonte: plan.md §3 "Interface do repositório de treinos" + "Fake do
// repositório de treinos" ("mesma ordem de listagem, mesmas validações e
// mensagens, mesmo mapeamento de violação D14 e guarda D6") + tasks.json
// TASK-005:description e acceptanceCriteria.
//
// Seed do aggregate: `{ workouts, entries, series }` (as três coleções que a
// fake mantém em memória), no padrão de seed controlado das fakes do módulo.
// ---------------------------------------------------------------------------

const EMAIL = "contrato@hestia.lan";
const PROGRAM_A = "prog-a";
const PROGRAM_B = "prog-b";

interface WorkoutSeed {
  workouts?: Workout[];
  entries?: WorkoutEntry[];
  series?: WorkoutSeries[];
}

function makeWorkout(
  id: string,
  programId: string,
  name: string,
  createdAt: string,
): Workout {
  return { id, programId, name, createdAt, created_by: EMAIL };
}

function makeEntry(
  id: string,
  workoutId: string,
  programId: string,
  exerciseId: string,
  position: number,
  restSeconds: number | null = null,
): WorkoutEntry {
  return {
    id,
    workoutId,
    programId,
    exerciseId,
    position,
    restSeconds,
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
  };
}

function makeSeries(
  id: string,
  entryId: string,
  position: number,
  fields: {
    reps?: number | null;
    durationSeconds?: number | null;
    load?: number | null;
  } = {},
): WorkoutSeries {
  return {
    id,
    entryId,
    position,
    reps: fields.reps ?? null,
    durationSeconds: fields.durationSeconds ?? null,
    load: fields.load ?? null,
    createdAt: "2026-10-01T10:00:00.000Z",
    created_by: EMAIL,
  };
}

function defineWorkoutRepositoryContract(
  label: string,
  build: (seed?: WorkoutSeed) => IWorkoutRepository,
) {
  describe(`IWorkoutRepository contract: ${label}`, () => {
    let repo: IWorkoutRepository;

    beforeEach(() => {
      repo = build();
    });

    // ---------------------------------------------------------------------
    // listWorkoutsByProgram / findWorkoutById
    // ---------------------------------------------------------------------
    describe("listWorkoutsByProgram", () => {
      it("lista só os treinos do Programa, vazia quando não há treinos", async () => {
        expect(await repo.listWorkoutsByProgram(PROGRAM_A)).toEqual([]);
      });

      it("ordena por created_at asc (antigo primeiro)", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-novo", PROGRAM_A, "Novo", "2026-06-01T10:00:00.000Z"),
            makeWorkout("w-velho", PROGRAM_A, "Velho", "2026-01-01T10:00:00.000Z"),
            makeWorkout("w-meio", PROGRAM_A, "Meio", "2026-03-01T10:00:00.000Z"),
          ],
        });

        expect((await seeded.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id)).toEqual([
          "w-velho",
          "w-meio",
          "w-novo",
        ]);
      });

      it("desempata por id asc quando created_at empata", async () => {
        const empatado = "2026-10-01T10:00:00.000Z";
        const seeded = build({
          workouts: [
            // Orde de seed proposital fora de ordem: o desempate é o id.
            makeWorkout("w-b", PROGRAM_A, "Treino B", empatado),
            makeWorkout("w-a", PROGRAM_A, "Treino A", empatado),
            makeWorkout("w-c", PROGRAM_A, "Treino C", empatado),
          ],
        });

        expect((await seeded.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id)).toEqual([
          "w-a",
          "w-b",
          "w-c",
        ]);
      });

      it("não mistura treinos de outro Programa", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-a1", PROGRAM_A, "A", "2026-05-01T10:00:00.000Z"),
            makeWorkout("w-b1", PROGRAM_B, "B", "2026-01-01T10:00:00.000Z"),
          ],
        });

        expect((await seeded.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id)).toEqual([
          "w-a1",
        ]);
        expect((await seeded.listWorkoutsByProgram(PROGRAM_B)).map((w) => w.id)).toEqual([
          "w-b1",
        ]);
      });
    });

    it("findWorkoutById devolve o treino ou null para id desconhecido", async () => {
      const created = await repo.createWorkout(
        PROGRAM_A,
        { name: "Push" },
        EMAIL,
      );
      const found = await repo.findWorkoutById(created.id);
      expect(found).toMatchObject({ id: created.id, programId: PROGRAM_A, name: "Push" });
      expect(await repo.findWorkoutById("id-que-nao-existe")).toBeNull();
    });

    // ---------------------------------------------------------------------
    // createWorkout — nome obrigatório (D11) e único no Programa (D11)
    // ---------------------------------------------------------------------
    describe("createWorkout", () => {
      it("cria com nome normalizado, Programa e auditoria de criador", async () => {
        const created = await repo.createWorkout(
          PROGRAM_A,
          { name: "  Treino   A " },
          EMAIL,
        );

        expect(created.id).toBeDefined();
        expect(created.programId).toBe(PROGRAM_A);
        expect(created.name).toBe("Treino A"); // normalizarNomeTreino (trim + colapso)
        expect(created.created_by).toBe(EMAIL);
        expect(created.createdAt).toBeDefined();
        expect(await repo.listWorkoutsByProgram(PROGRAM_A)).toHaveLength(1);
      });

      it.each([[""], ["   "], ["\t"]])(
        "bloqueia nome vazio/só espaços com MSG_NOME_TREINO_OBRIGATORIO (%j)",
        async (name) => {
          await expect(
            repo.createWorkout(PROGRAM_A, { name }, EMAIL),
          ).rejects.toThrow(MSG_NOME_TREINO_OBRIGATORIO);
          expect(await repo.listWorkoutsByProgram(PROGRAM_A)).toEqual([]);
        },
      );

      it("bloqueia nome repetido no mesmo Programa com MSG_NOME_TREINO_DUPLICADO (normalização caixa/espaços)", async () => {
        await repo.createWorkout(PROGRAM_A, { name: "Push" }, EMAIL);

        await expect(
          repo.createWorkout(PROGRAM_A, { name: "  PUSH  " }, EMAIL),
        ).rejects.toThrow(MSG_NOME_TREINO_DUPLICADO);
        expect(await repo.listWorkoutsByProgram(PROGRAM_A)).toHaveLength(1);
      });

      it("permite o mesmo nome em Programas diferentes", async () => {
        await repo.createWorkout(PROGRAM_A, { name: "Push" }, EMAIL);
        const outro = await repo.createWorkout(PROGRAM_B, { name: "Push" }, EMAIL);

        expect(outro.programId).toBe(PROGRAM_B);
        expect(await repo.listWorkoutsByProgram(PROGRAM_B)).toHaveLength(1);
      });
    });

    // ---------------------------------------------------------------------
    // updateWorkoutName — mesma validação, excluindo o próprio treino
    // ---------------------------------------------------------------------
    describe("updateWorkoutName", () => {
      it("renomeia persistindo o nome normalizado", async () => {
        const created = await repo.createWorkout(
          PROGRAM_A,
          { name: "Push" },
          EMAIL,
        );

        const updated = await repo.updateWorkoutName(created.id, {
          name: "  Push   A ",
        });

        expect(updated.id).toBe(created.id);
        expect(updated.name).toBe("Push A");
        expect((await repo.findWorkoutById(created.id))?.name).toBe("Push A");
        expect(await repo.listWorkoutsByProgram(PROGRAM_A)).toHaveLength(1);
      });

      it("renomear para o próprio nome (variação de caixa/espaços) é aceito — exclui a si próprio da checagem", async () => {
        const created = await repo.createWorkout(
          PROGRAM_A,
          { name: "Push" },
          EMAIL,
        );

        const updated = await repo.updateWorkoutName(created.id, {
          name: "  push ",
        });

        expect(updated.name).toBe("push");
        expect(await repo.listWorkoutsByProgram(PROGRAM_A)).toHaveLength(1);
      });

      it("bloqueia renomeação que colide com OUTRO treino do mesmo Programa", async () => {
        await repo.createWorkout(PROGRAM_A, { name: "Push" }, EMAIL);
        const segundo = await repo.createWorkout(PROGRAM_A, { name: "Leg" }, EMAIL);

        await expect(
          repo.updateWorkoutName(segundo.id, { name: " PUSH " }),
        ).rejects.toThrow(MSG_NOME_TREINO_DUPLICADO);
        expect((await repo.findWorkoutById(segundo.id))?.name).toBe("Leg");
      });

      it("bloqueia renomeação para nome vazio com MSG_NOME_TREINO_OBRIGATORIO", async () => {
        const created = await repo.createWorkout(
          PROGRAM_A,
          { name: "Push" },
          EMAIL,
        );

        await expect(
          repo.updateWorkoutName(created.id, { name: "   " }),
        ).rejects.toThrow(MSG_NOME_TREINO_OBRIGATORIO);
        expect((await repo.findWorkoutById(created.id))?.name).toBe("Push");
      });

      it("permite renomear para nome usado em outro Programa", async () => {
        await repo.createWorkout(PROGRAM_B, { name: "Push" }, EMAIL);
        const created = await repo.createWorkout(
          PROGRAM_A,
          { name: "Treino A" },
          EMAIL,
        );

        const updated = await repo.updateWorkoutName(created.id, { name: "Push" });
        expect(updated.name).toBe("Push");
      });
    });

    // ---------------------------------------------------------------------
    // deleteWorkout — guarda D6 (treino com exercícios não exclui)
    // ---------------------------------------------------------------------
    describe("deleteWorkout", () => {
      it("lança MSG_TREINO_COM_EXERCICIOS quando há entradas e NÃO remove nada", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-1", PROGRAM_A, "Com exercício", "2026-10-01T09:00:00.000Z"),
            makeWorkout("w-2", PROGRAM_A, "Outro", "2026-10-01T09:05:00.000Z"),
          ],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
        });

        await expect(seeded.deleteWorkout("w-1")).rejects.toThrow(
          MSG_TREINO_COM_EXERCICIOS,
        );

        // Nada removido: treino, entrada e o vizinho permanecem intactos.
        expect((await seeded.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id)).toEqual([
          "w-1",
          "w-2",
        ]);
        expect(await seeded.listEntriesByWorkout("w-1")).toHaveLength(1);
      });

      it("remove treino sem exercícios e mantém os demais", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-1", PROGRAM_A, "Vazio", "2026-10-01T09:00:00.000Z"),
            makeWorkout("w-2", PROGRAM_A, "Outro", "2026-10-01T09:05:00.000Z"),
          ],
        });

        await seeded.deleteWorkout("w-1");

        expect((await seeded.listWorkoutsByProgram(PROGRAM_A)).map((w) => w.id)).toEqual([
          "w-2",
        ]);
        expect(await seeded.findWorkoutById("w-1")).toBeNull();
      });

      it("excluir treino sem exercícios não afeta entradas de outro treino do mesmo Programa", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-1", PROGRAM_A, "Vazio", "2026-10-01T09:00:00.000Z"),
            makeWorkout("w-2", PROGRAM_A, "Cheio", "2026-10-01T09:05:00.000Z"),
          ],
          entries: [makeEntry("e-1", "w-2", PROGRAM_A, "ex-1", 1)],
        });

        await seeded.deleteWorkout("w-1");

        expect(await seeded.listEntriesByWorkout("w-2")).toHaveLength(1);
      });
    });

    // ---------------------------------------------------------------------
    // Guardas de conteúdo (guardas frescos do usePrograms, TASK-010)
    // ---------------------------------------------------------------------
    describe("hasWorkouts / hasWorkoutWithExercise", () => {
      it("hasWorkouts é false sem treinos e true com qualquer treino", async () => {
        expect(await repo.hasWorkouts(PROGRAM_A)).toBe(false);

        await repo.createWorkout(PROGRAM_A, { name: "Push" }, EMAIL);

        expect(await repo.hasWorkouts(PROGRAM_A)).toBe(true);
        // Outro Programa continua sem treinos.
        expect(await repo.hasWorkouts(PROGRAM_B)).toBe(false);
      });

      it("hasWorkoutWithExercise é false para Programa sem entradas", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Sem exercício", "2026-10-01T09:00:00.000Z")],
        });

        expect(await seeded.hasWorkouts(PROGRAM_A)).toBe(true);
        expect(await seeded.hasWorkoutWithExercise(PROGRAM_A)).toBe(false);
      });

      it("hasWorkoutWithExercise é true quando existe alguma entrada no Programa (mesmo em outro treino)", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-1", PROGRAM_A, "Um", "2026-10-01T09:00:00.000Z"),
            makeWorkout("w-2", PROGRAM_A, "Dois", "2026-10-01T09:05:00.000Z"),
          ],
          entries: [makeEntry("e-1", "w-2", PROGRAM_A, "ex-1", 1)],
        });

        expect(await seeded.hasWorkoutWithExercise(PROGRAM_A)).toBe(true);
        // O outro Programa permanece sem conteúdo mínimo.
        expect(await seeded.hasWorkoutWithExercise(PROGRAM_B)).toBe(false);
      });
    });

    // ---------------------------------------------------------------------
    // addEntry — posição max+1 e unicidade de exercício por Programa (D14)
    // ---------------------------------------------------------------------
    describe("addEntry", () => {
      it("posiciona a nova entrada em max+1 do treino", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [
            makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1),
            makeEntry("e-2", "w-1", PROGRAM_A, "ex-2", 2),
          ],
        });

        const added = await seeded.addEntry("w-1", PROGRAM_A, "ex-3", EMAIL);

        expect(added).toMatchObject({
          workoutId: "w-1",
          programId: PROGRAM_A,
          exerciseId: "ex-3",
          position: 3,
          restSeconds: null,
          created_by: EMAIL,
        });
        expect(await seeded.listEntriesByWorkout("w-1")).toHaveLength(3);
      });

      it("primeira entrada de treino vazio ocupa a posição 1", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
        });

        const added = await seeded.addEntry("w-1", PROGRAM_A, "ex-1", EMAIL);
        expect(added.position).toBe(1);
      });

      it("D14: bloqueia o mesmo exercício NO MESMO treino com MSG_EXERCICIO_JA_NO_TREINO", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
        });

        await expect(
          seeded.addEntry("w-1", PROGRAM_A, "ex-1", EMAIL),
        ).rejects.toThrow(MSG_EXERCICIO_JA_NO_TREINO);
        expect(await seeded.listEntriesByWorkout("w-1")).toHaveLength(1);
      });

      it("D14: permite o mesmo exercício em TREINO DIFERENTE do mesmo Programa", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z"),
            makeWorkout("w-2", PROGRAM_A, "Pull", "2026-10-01T09:05:00.000Z"),
          ],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
        });

        const added = await seeded.addEntry("w-2", PROGRAM_A, "ex-1", EMAIL);

        expect(added.position).toBe(1);
        expect(await seeded.listEntriesByWorkout("w-2")).toHaveLength(1);
        expect(await seeded.listEntriesByProgram(PROGRAM_A)).toHaveLength(2);
      });

      it("D14: permite o mesmo exercício em OUTRO Programa", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z"),
            makeWorkout("w-2", PROGRAM_B, "Push", "2026-10-01T09:05:00.000Z"),
          ],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
        });

        const added = await seeded.addEntry("w-2", PROGRAM_B, "ex-1", EMAIL);

        expect(added.position).toBe(1);
        expect(await seeded.listEntriesByWorkout("w-2")).toHaveLength(1);
        expect(await seeded.listEntriesByProgram(PROGRAM_B)).toHaveLength(1);
      });
    });

    // ---------------------------------------------------------------------
    // Entradas: listagem, remoção e reordenação
    // ---------------------------------------------------------------------
    describe("listEntriesByWorkout / listEntriesByProgram", () => {
      it("lista as entradas do treino ordenadas por position asc", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [
            makeEntry("e-2", "w-1", PROGRAM_A, "ex-2", 2),
            makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1),
          ],
        });

        expect((await seeded.listEntriesByWorkout("w-1")).map((e) => e.id)).toEqual([
          "e-1",
          "e-2",
        ]);
      });

      it("lista as entradas do Programa (base do conjunto D14) incluindo vários treinos", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-1", PROGRAM_A, "Um", "2026-10-01T09:00:00.000Z"),
            makeWorkout("w-2", PROGRAM_A, "Dois", "2026-10-01T09:05:00.000Z"),
          ],
          entries: [
            makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1),
            makeEntry("e-2", "w-2", PROGRAM_A, "ex-2", 1),
          ],
        });

        const byProgram = await seeded.listEntriesByProgram(PROGRAM_A);
        expect(byProgram.map((e) => e.id).sort()).toEqual(["e-1", "e-2"]);
        expect(await seeded.listEntriesByProgram(PROGRAM_B)).toEqual([]);
      });
    });

    describe("removeEntry", () => {
      it("apaga as séries da entrada e depois a entrada", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z"),
          ],
          entries: [
            makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1),
            makeEntry("e-2", "w-1", PROGRAM_A, "ex-2", 2),
          ],
          series: [
            makeSeries("s-1", "e-1", 1, { reps: 10 }),
            makeSeries("s-2", "e-1", 2, { reps: 12 }),
            makeSeries("s-3", "e-2", 1, { reps: 8 }),
          ],
        });

        await seeded.removeEntry("e-1");

        expect(await seeded.listSeriesByEntry("e-1")).toEqual([]);
        expect((await seeded.listEntriesByWorkout("w-1")).map((e) => e.id)).toEqual(["e-2"]);
        // As séries da outra entrada permanecem intactas.
        expect(await seeded.listSeriesByEntry("e-2")).toHaveLength(1);
      });

      it("remove entrada mesmo sem séries associadas", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
        });

        await seeded.removeEntry("e-1");

        expect(await seeded.listEntriesByWorkout("w-1")).toEqual([]);
      });
    });

    describe("reorderEntries", () => {
      it("persiste positions 1..n na ordem recebida", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [
            makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1),
            makeEntry("e-2", "w-1", PROGRAM_A, "ex-2", 2),
            makeEntry("e-3", "w-1", PROGRAM_A, "ex-3", 3),
          ],
        });

        await seeded.reorderEntries("w-1", ["e-3", "e-1", "e-2"]);

        const listed = await seeded.listEntriesByWorkout("w-1");
        expect(listed.map((e) => [e.id, e.position])).toEqual([
          ["e-3", 1],
          ["e-1", 2],
          ["e-2", 3],
        ]);
      });

      it("rejeita conjunto de ids que não é exatamente o do treino e nada muda", async () => {
        const seeded = build({
          workouts: [
            makeWorkout("w-1", PROGRAM_A, "Um", "2026-10-01T09:00:00.000Z"),
            makeWorkout("w-2", PROGRAM_A, "Dois", "2026-10-01T09:05:00.000Z"),
          ],
          entries: [
            makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1),
            makeEntry("e-2", "w-1", PROGRAM_A, "ex-2", 2),
            makeEntry("e-3", "w-2", PROGRAM_A, "ex-3", 1),
          ],
        });

        // id de OUTRO treino entra na lista → rejeita.
        await expect(
          seeded.reorderEntries("w-1", ["e-2", "e-1", "e-3"]),
        ).rejects.toThrow();
        // id faltando (conjunto incompleto) → rejeita.
        await expect(seeded.reorderEntries("w-1", ["e-1"])).rejects.toThrow();

        expect((await seeded.listEntriesByWorkout("w-1")).map((e) => [e.id, e.position])).toEqual([
          ["e-1", 1],
          ["e-2", 2],
        ]);
        // A entrada do outro treino não foi movida.
        expect((await seeded.listEntriesByWorkout("w-2"))[0].position).toBe(1);
      });
    });

    // ---------------------------------------------------------------------
    // Séries: quantidade, campos e aplicar-a-todas (D2/D4/D5)
    // ---------------------------------------------------------------------
    describe("setSeriesQuantity", () => {
      it("cria a quantidade pedida com todos os campos vazios (position 1..n)", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
        });

        const created = await seeded.setSeriesQuantity("e-1", 3, EMAIL);

        expect(created).toHaveLength(3);
        expect(created.map((s) => s.position)).toEqual([1, 2, 3]);
        for (const serie of created) {
          expect(serie.entryId).toBe("e-1");
          expect(serie.reps).toBeNull();
          expect(serie.durationSeconds).toBeNull();
          expect(serie.load).toBeNull();
        }
        expect(await seeded.listSeriesByEntry("e-1")).toHaveLength(3);
      });

      it("quantidade 0 remove todas as séries", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [
            makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1),
            makeEntry("e-2", "w-1", PROGRAM_A, "ex-2", 2),
          ],
          series: [
            makeSeries("s-1", "e-1", 1, { reps: 10 }),
            makeSeries("s-2", "e-1", 2, { load: 40 }),
            makeSeries("s-3", "e-2", 1, { reps: 8 }),
          ],
        });

        const result = await seeded.setSeriesQuantity("e-1", 0, EMAIL);

        expect(result).toEqual([]);
        expect(await seeded.listSeriesByEntry("e-1")).toEqual([]);
        // A outra entrada não é afetada.
        expect(await seeded.listSeriesByEntry("e-2")).toHaveLength(1);
      });

      it("aumento acrescenta séries vazias ao final sem tocar nas existentes", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { reps: 10, load: 40 }),
            makeSeries("s-2", "e-1", 2, { reps: 12, load: 45 }),
          ],
        });

        const result = await seeded.setSeriesQuantity("e-1", 5, EMAIL);

        expect(result).toHaveLength(5);
        expect(result.map((s) => s.position)).toEqual([1, 2, 3, 4, 5]);
        // Existentes preservadas.
        expect(result[0]).toMatchObject({ id: "s-1", reps: 10, load: 40 });
        expect(result[1]).toMatchObject({ id: "s-2", reps: 12, load: 45 });
        // Novas vazias ao final.
        for (const nova of result.slice(2)) {
          expect(nova.reps).toBeNull();
          expect(nova.durationSeconds).toBeNull();
          expect(nova.load).toBeNull();
        }
        expect(await seeded.listSeriesByEntry("e-1")).toHaveLength(5);
      });

      it("redução remove as séries de maior position (as últimas)", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { reps: 10 }),
            makeSeries("s-2", "e-1", 2, { reps: 12 }),
            makeSeries("s-3", "e-1", 3, { reps: 14 }),
            makeSeries("s-4", "e-1", 4, { reps: 16 }),
            makeSeries("s-5", "e-1", 5, { reps: 18 }),
          ],
        });

        const result = await seeded.setSeriesQuantity("e-1", 3, EMAIL);

        expect(result.map((s) => s.id)).toEqual(["s-1", "s-2", "s-3"]);
        expect(result.map((s) => s.position)).toEqual([1, 2, 3]);
        expect(await seeded.listSeriesByEntry("e-1")).toHaveLength(3);
      });
    });

    describe("listSeriesByEntry", () => {
      it("lista as séries da entrada em ordem de position asc", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-3", "e-1", 3),
            makeSeries("s-1", "e-1", 1),
            makeSeries("s-2", "e-1", 2),
          ],
        });

        expect((await seeded.listSeriesByEntry("e-1")).map((s) => s.id)).toEqual([
          "s-1",
          "s-2",
          "s-3",
        ]);
        expect(await seeded.listSeriesByEntry("e-inexistente")).toEqual([]);
      });
    });

    describe("updateSeriesFields", () => {
      it("grava somente os campos enviados e preserva os demais", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { reps: 10, durationSeconds: 30, load: 40 }),
          ],
        });

        const semReps = await seeded.updateSeriesFields("s-1", { reps: 12 });

        expect(semReps).toMatchObject({
          id: "s-1",
          position: 1,
          reps: 12,
          durationSeconds: 30, // intocado
          load: 40, // intocado
        });
      });

      it("aceita null explícito para limpar um campo (e só aquele)", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { reps: 10, durationSeconds: 30, load: 40 }),
          ],
        });

        const limpo = await seeded.updateSeriesFields("s-1", { durationSeconds: null });

        expect(limpo.durationSeconds).toBeNull();
        expect(limpo.reps).toBe(10);
        expect(limpo.load).toBe(40);
      });

      it("aceita carga 0 (zero é valor legítimo, diferente de vazio)", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [makeSeries("s-1", "e-1", 1, { load: 40 })],
        });

        const zerado = await seeded.updateSeriesFields("s-1", { load: 0 });

        expect(zerado.load).toBe(0);
        expect(await seeded.listSeriesByEntry("e-1")).toHaveLength(1);
      });
    });

    describe("applySeriesToAll", () => {
      it("copia reps/tempo/carga da origem para as demais séries", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { reps: 10, durationSeconds: 45, load: 40 }),
            makeSeries("s-2", "e-1", 2),
            makeSeries("s-3", "e-1", 3, { reps: 99, load: 99 }),
          ],
        });

        const result = await seeded.applySeriesToAll("e-1", "s-1");

        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({ id: "s-1", position: 1, reps: 10, durationSeconds: 45, load: 40 });
        expect(result[1]).toMatchObject({ id: "s-2", position: 2, reps: 10, durationSeconds: 45, load: 40 });
        // Sobrescreve o que já tinha outro valor (re-executável).
        expect(result[2]).toMatchObject({ id: "s-3", position: 3, reps: 10, durationSeconds: 45, load: 40 });
        // A origem não muda; só as demais recebem a cópia.
        expect((await seeded.listSeriesByEntry("e-1"))[0].reps).toBe(10);
      });

      it("é re-executável: acionada de novo a partir de outra série, sobrescreve a cópia anterior", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { reps: 10, load: 40 }),
            makeSeries("s-2", "e-1", 2, { reps: 8, load: 35 }),
          ],
        });

        // 1º apply: cópia de s-1 (10, 40) sobrescreve s-2 → s-2 passa a (10, 40).
        await seeded.applySeriesToAll("e-1", "s-1");
        // 2º apply: origem agora é s-2, cujos valores ATUAIS são (10, 40).
        const deNovo = await seeded.applySeriesToAll("e-1", "s-2");

        expect(deNovo.map((s) => [s.reps, s.load])).toEqual([
          [10, 40],
          [10, 40],
        ]);
      });

      it("não copia o descanso (campo único da entrada, D4)", async () => {
        const seeded = build({
          entries: [
            { ...makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1), restSeconds: 90 },
          ],
          series: [
            makeSeries("s-1", "e-1", 1, { reps: 10 }),
            makeSeries("s-2", "e-1", 2),
          ],
        });

        const [entrada] = await seeded.listEntriesByWorkout("w-1");
        expect(entrada.restSeconds).toBe(90);

        await seeded.applySeriesToAll("e-1", "s-1");

        const [depois] = await seeded.listEntriesByWorkout("w-1");
        expect(depois.restSeconds).toBe(90);
      });
    });

    // ---------------------------------------------------------------------
    // setEntryRestSeconds — descanso é campo único da entrada (D4)
    // ---------------------------------------------------------------------
    describe("setEntryRestSeconds", () => {
      it("grava valor numérico e persiste na listagem", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
        });

        await seeded.setEntryRestSeconds("e-1", 90);

        const [entrada] = await seeded.listEntriesByWorkout("w-1");
        expect(entrada.restSeconds).toBe(90);
      });

      it("grava null (voltar a ficar vazio)", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [
            { ...makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1), restSeconds: 90 },
          ],
        });

        await seeded.setEntryRestSeconds("e-1", null);

        const [entrada] = await seeded.listEntriesByWorkout("w-1");
        expect(entrada.restSeconds).toBeNull();
      });
    });
  });
}

defineWorkoutRepositoryContract(
  "fake em memória",
  (seed: WorkoutSeed = {}) => createFakeWorkoutRepository(seed),
);
