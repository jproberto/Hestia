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
    value?: number | null;
    load?: number | null;
  } = {},
): WorkoutSeries {
  return {
    id,
    entryId,
    position,
    value: fields.value ?? null,
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
            makeSeries("s-1", "e-1", 1, { value: 10 }),
            makeSeries("s-2", "e-1", 2, { value: 12 }),
            makeSeries("s-3", "e-2", 1, { value: 8 }),
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
          expect(serie.value).toBeNull();
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
            makeSeries("s-1", "e-1", 1, { value: 10 }),
            makeSeries("s-2", "e-1", 2, { load: 40 }),
            makeSeries("s-3", "e-2", 1, { value: 8 }),
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
            makeSeries("s-1", "e-1", 1, { value: 10, load: 40 }),
            makeSeries("s-2", "e-1", 2, { value: 12, load: 45 }),
          ],
        });

        const result = await seeded.setSeriesQuantity("e-1", 5, EMAIL);

        expect(result).toHaveLength(5);
        expect(result.map((s) => s.position)).toEqual([1, 2, 3, 4, 5]);
        // Existentes preservadas.
        expect(result[0]).toMatchObject({ id: "s-1", value: 10, load: 40 });
        expect(result[1]).toMatchObject({ id: "s-2", value: 12, load: 45 });
        // Novas vazias ao final.
        for (const nova of result.slice(2)) {
          expect(nova.value).toBeNull();
          expect(nova.load).toBeNull();
        }
        expect(await seeded.listSeriesByEntry("e-1")).toHaveLength(5);
      });

      it("redução remove as séries de maior position (as últimas)", async () => {
        const seeded = build({
          workouts: [makeWorkout("w-1", PROGRAM_A, "Push", "2026-10-01T09:00:00.000Z")],
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { value: 10 }),
            makeSeries("s-2", "e-1", 2, { value: 12 }),
            makeSeries("s-3", "e-1", 3, { value: 14 }),
            makeSeries("s-4", "e-1", 4, { value: 16 }),
            makeSeries("s-5", "e-1", 5, { value: 18 }),
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
            makeSeries("s-1", "e-1", 1, { value: 10, load: 40 }),
          ],
        });

        const semValue = await seeded.updateSeriesFields("s-1", { value: 12 });

        expect(semValue).toMatchObject({
          id: "s-1",
          position: 1,
          value: 12,
          load: 40, // intocado
        });
      });

      it("aceita null explícito para limpar um campo (e só aquele)", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { value: 10, load: 40 }),
          ],
        });

        const limpo = await seeded.updateSeriesFields("s-1", { value: null });

        expect(limpo.value).toBeNull();
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
      it("copia valor/carga da origem para as demais séries", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { value: 10, load: 40 }),
            makeSeries("s-2", "e-1", 2),
            makeSeries("s-3", "e-1", 3, { value: 99, load: 99 }),
          ],
        });

        const result = await seeded.applySeriesToAll("e-1", "s-1");

        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({ id: "s-1", position: 1, value: 10, load: 40 });
        expect(result[1]).toMatchObject({ id: "s-2", position: 2, value: 10, load: 40 });
        // Sobrescreve o que já tinha outro valor (re-executável).
        expect(result[2]).toMatchObject({ id: "s-3", position: 3, value: 10, load: 40 });
        // A origem não muda; só as demais recebem a cópia.
        expect((await seeded.listSeriesByEntry("e-1"))[0].value).toBe(10);
      });

      it("é re-executável: acionada de novo a partir de outra série, sobrescreve a cópia anterior", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { value: 10, load: 40 }),
            makeSeries("s-2", "e-1", 2, { value: 8, load: 35 }),
          ],
        });

        // 1º apply: cópia de s-1 (10, 40) sobrescreve s-2 → s-2 passa a (10, 40).
        await seeded.applySeriesToAll("e-1", "s-1");
        // 2º apply: origem agora é s-2, cujos valores ATUAIS são (10, 40).
        const deNovo = await seeded.applySeriesToAll("e-1", "s-2");

        expect(deNovo.map((s) => [s.value, s.load])).toEqual([
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
            makeSeries("s-1", "e-1", 1, { value: 10 }),
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

    // ---------------------------------------------------------------------
    // applySeriesToFollowing — replicação incondicional (Mílon #5, D4)
    // Comportamento único de todo salvamento do modal: atualiza a origem e
    // replica para as seguintes (posição maior) incluindo as já marcadas,
    // preservando o feito; série anterior à origem nunca muda; na última
    // série só a origem permanece. Não toca em execução nem realizadas.
    // Ainda NÃO existe no fake: estes blocos falham até Hefesto entregá-lo.
    // ---------------------------------------------------------------------
    describe("applySeriesToFollowing", () => {
      it("copia origem para ela mais as seguintes, sem tocar nas anteriores", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { value: 8, load: 30 }),
            makeSeries("s-2", "e-1", 2, { value: 10, load: 40 }),
            makeSeries("s-3", "e-1", 3, { value: 99, load: 99 }),
            makeSeries("s-4", "e-1", 4),
          ],
        });

        const result = await seeded.applySeriesToFollowing("e-1", "s-2");

        expect(result.map((s: { position: number }) => s.position)).toEqual([1, 2, 3, 4]);
        // Anterior intacta.
        expect(result[0]).toMatchObject({ id: "s-1", value: 8, load: 30 });
        // Origem preservada.
        expect(result[1]).toMatchObject({
          id: "s-2",
          position: 2,
          value: 10,
          load: 40,
        });
        // Seguintes sobrescritas com os valores da origem (incondicional,
        // mesmo as já marcadas — o feito nunca é tocado, só o planejado).
        expect(result[2]).toMatchObject({
          id: "s-3",
          position: 3,
          value: 10,
          load: 40,
        });
        expect(result[3]).toMatchObject({
          id: "s-4",
          position: 4,
          value: 10,
          load: 40,
        });
      });

      it("na última série da entrada atualiza somente a origem", async () => {
        const seeded = build({
          entries: [makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1)],
          series: [
            makeSeries("s-1", "e-1", 1, { value: 8, load: 30 }),
            makeSeries("s-2", "e-1", 2, { value: 10, load: 40 }),
          ],
        });

        const result = await seeded.applySeriesToFollowing("e-1", "s-2");

        expect(result.map((s: { id: string }) => s.id)).toEqual(["s-1", "s-2"]);
        expect(result[0]).toMatchObject({ id: "s-1", value: 8, load: 30 });
        expect(result[1]).toMatchObject({ id: "s-2", value: 10, load: 40 });
      });

      it("não vaza para outra entrada do mesmo treino", async () => {
        const seeded = build({
          entries: [
            makeEntry("e-1", "w-1", PROGRAM_A, "ex-1", 1),
            makeEntry("e-2", "w-1", PROGRAM_A, "ex-2", 2),
          ],
          series: [
            makeSeries("s-1", "e-1", 1, { value: 10, load: 40 }),
            makeSeries("s-2", "e-1", 2, { value: 5, load: 20 }),
            makeSeries("s-9", "e-2", 1, { value: 7, load: 25 }),
          ],
        });

        await seeded.applySeriesToFollowing("e-1", "s-1");

        expect(
          (await seeded.listSeriesByEntry("e-2")).map((s: { id: string; value: number | null }) => [
            s.id,
            s.value,
          ]),
        ).toEqual([["s-9", 7]]);
      });
    });
  });
}

defineWorkoutRepositoryContract(
  "fake em memória",
  (seed: WorkoutSeed = {}) => createFakeWorkoutRepository(seed),
);

// ---------------------------------------------------------------------------
// Contrato RED da TASK-010 (Mílon #5, Aditamento 2026-10-09 "0012 CORRETA").
// Fonte: tasks.json TASK-010 (contract-workouts: criação com padrões +
// ajustes da entry) + plan.md Aditamento 0012 CORRETA §1 Mudanças A/B +
// §3 (Modo/Unidade da entry + Ajustes de modo/unidade da entry) + D29/D33.
//
// Contrato fixado aqui (nomes que a TASK-011 deve implementar):
// - WorkoutEntryRow/WorkoutEntry ganham `mode` (repeticao|tempo) e
//   `loadUnit` (kg|lb), OPCIONAIS com fallback de leitura
//   (repeticao/kg) para não quebrar fixtures pré-0012 — mesmo padrão do
//   `mode?` do exercício; novas entries nascem com repeticao+kg;
// - novas operações `setEntryMode(entryId, mode)` +
//   `setEntryModeStandalone(entryId, mode)` e
//   `setEntryLoadUnit(entryId, unit)` +
//   `setEntryLoadUnitStandalone(entryId, unit)` no repositório de treinos,
//   espelhadas no fake e no contrato IWorkoutRepository;
// - leitura de entry pré-migração (sem os campos) trata nulo como
//   repeticao/kg.
//
// Expected: FAIL — o repository e o fake ainda não têm modo/unidade na
// entry nem os ajustes. Hefesto fará GREEN na TASK-011 sem mudar estes
// testes. Casts `as unknown as` mantêm o tsc verde no RED (a falha é em
// runtime, não em tipo).
// ---------------------------------------------------------------------------
describe("modo e unidade da entry (TASK-010 — RED)", () => {
  type EntryComModo = WorkoutEntry & {
    mode?: "repeticao" | "tempo" | null;
    loadUnit?: "kg" | "lb" | null;
  };

  function entryComoRegistro(entry: WorkoutEntry): Record<string, unknown> {
    return entry as unknown as Record<string, unknown>;
  }

  it("addEntry devolve a entry com padrões repeticao e kg", async () => {
    const repo = createFakeWorkoutRepository();

    const entry = (await repo.addEntry(
      "w-1",
      PROGRAM_A,
      "ex-1",
      EMAIL,
    )) as unknown as EntryComModo;

    expect(entry.mode).toBe("repeticao");
    expect(entry.loadUnit).toBe("kg");
  });

  it("setEntryMode existe e persiste com reflexo em leitura", async () => {
    const repo = createFakeWorkoutRepository();
    const entry = await repo.addEntry("w-1", PROGRAM_A, "ex-1", EMAIL);

    const api = repo as unknown as {
      setEntryMode: (entryId: string, mode: "repeticao" | "tempo") => Promise<void>;
    };
    expect(typeof api.setEntryMode).toBe("function");
    await api.setEntryMode(entry.id, "tempo");

    const lidas = (await repo.listEntriesByWorkout(
      "w-1",
    )) as unknown as EntryComModo[];
    expect(lidas).toHaveLength(1);
    expect(lidas[0].mode).toBe("tempo");
    // O ajuste de modo não mexe na unidade.
    expect(lidas[0].loadUnit).toBe("kg");
  });

  it("setEntryLoadUnit existe e persiste com reflexo em leitura", async () => {
    const repo = createFakeWorkoutRepository();
    const entry = await repo.addEntry("w-1", PROGRAM_A, "ex-1", EMAIL);

    const api = repo as unknown as {
      setEntryLoadUnit: (entryId: string, unit: "kg" | "lb") => Promise<void>;
    };
    expect(typeof api.setEntryLoadUnit).toBe("function");
    await api.setEntryLoadUnit(entry.id, "lb");

    const lidas = (await repo.listEntriesByWorkout(
      "w-1",
    )) as unknown as EntryComModo[];
    expect(lidas).toHaveLength(1);
    expect(lidas[0].loadUnit).toBe("lb");
    // O ajuste de unidade não mexe no modo.
    expect(lidas[0].mode).toBe("repeticao");
  });

  it("leitura de entry pré-migração (sem os campos) trata nulo como repeticao/kg", async () => {
    const repo = createFakeWorkoutRepository({
      entries: [makeEntry("e-pre", "w-1", PROGRAM_A, "ex-1", 1)],
    });

    const lidas = await repo.listEntriesByWorkout("w-1");
    expect(lidas).toHaveLength(1);
    expect(entryComoRegistro(lidas[0]).mode).toBe("repeticao");
    expect(entryComoRegistro(lidas[0]).loadUnit).toBe("kg");
  });
});

// ---------------------------------------------------------------------------
// Contrato RED da TASK-013 (Mílon #5, Aditamento 2026-10-10 "valor único +
// lb") — consumido pelas TASK-014/015.
// Fonte: tasks.json TASK-013 + plan.md Aditamento 2026-10-10 §3 (entrada de
// atualização com valor único + carga; replicação copiando value + carga;
// unidade da entry com lb) + spec §3.
// Expected: FAIL nos blocos de valor único (fake atual ignora `value`).
// O bloco lb é guarda (a fake repassa a unidade sem validar — passa antes e
// depois; a restrição real vive na migração 0014).
// Convenção: `value`/`lb` via cast — os tipos ainda não têm o novo contrato
// (RED inclui os tipos); em runtime os objetos os carregam.
// ---------------------------------------------------------------------------

describe("Milon 05 TASK-013 RED — contrato de treinos com valor único + lb (D34/D38)", () => {
  const CRIADO_EM_RED = "2026-10-01T10:00:00.000Z";

  function serieValorada(
    id: string,
    entryId: string,
    position: number,
    extra: Record<string, unknown> = {},
  ): WorkoutSeries {
    return {
      id,
      entryId,
      position,
      value: null,
      load: null,
      createdAt: CRIADO_EM_RED,
      created_by: EMAIL,
      ...extra,
    } as unknown as WorkoutSeries;
  }

  it("updateSeriesFields persiste o valor único e devolve a série com value", async () => {
    const repo = createFakeWorkoutRepository({
      series: [serieValorada("s1", "e1", 1)],
    });

    const atualizada = (await repo.updateSeriesFields("s1", {
      value: 12,
      load: 60,
    } as unknown as Parameters<
      IWorkoutRepository["updateSeriesFields"]
    >[1])) as unknown as Record<string, unknown>;
    expect(atualizada.value).toBe(12);
    expect(atualizada.load).toBe(60);
  });

  it("applySeriesToFollowing replica value + carga para as seguintes", async () => {
    const repo = createFakeWorkoutRepository({
      series: [serieValorada("s1", "e1", 1), serieValorada("s2", "e1", 2)],
    });
    await repo.updateSeriesFields("s1", {
      value: 8,
      load: 40,
    } as unknown as Parameters<IWorkoutRepository["updateSeriesFields"]>[1]);

    const refletidas = (await repo.applySeriesToFollowing(
      "e1",
      "s1",
    )) as unknown as Array<Record<string, unknown>>;
    const segunda = refletidas.find((s) => s.id === "s2");
    expect(segunda?.value).toBe(8);
    expect(segunda?.load).toBe(40);
  });

  it("setEntryLoadUnit persiste lb com reflexo em leitura (guarda D38)", async () => {
    const repo = createFakeWorkoutRepository({
      workouts: [makeWorkout("w-1", PROGRAM_A, "Push", CRIADO_EM_RED)],
      entries: [makeEntry("e-lb", "w-1", PROGRAM_A, "ex-1", 1)],
    });

    await repo.setEntryLoadUnit(
      "e-lb",
      "lb" as unknown as Parameters<IWorkoutRepository["setEntryLoadUnit"]>[1],
    );

    const lidas = await repo.listEntriesByWorkout("w-1");
    expect(lidas).toHaveLength(1);
    expect(lidas[0].loadUnit).toBe("lb");
  });
});
