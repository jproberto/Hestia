import { describe, it, expect, beforeEach } from "vitest";
import type { IProgramRepository } from "@/lib/milon/repositories/interfaces";
import { createFakeProgramRepository } from "@/lib/milon/repositories/fakes/fakeProgramRepository";
import type { Program, ProgramStatus } from "@/lib/milon/types";

// Contrato fakes-only (decisão 57): nenhum teste aqui bate no banco real.
// Só o fake em memória é exercitado; o repository real é verificado por tsc
// (mesmas assinaturas) e pelo consumo via barrel em TASK-005.
//
// Derivado de spec.md §3 (status/transições, unicidade do ativo por dono,
// ordenação por data de criação) + plan.md §3 (contrato dos 6 métodos) +
// tasks.json TASK-004:acceptanceCriteria.
const UNICITY_MESSAGE = "existe um programa ativo para este dono";

const OWNER_A = "ana@hestia.lan";
const OWNER_B = "bruno@hestia.lan";
const AUTHOR = "contrato@hestia.lan";

function makeProgram(
  id: string,
  title: string,
  owner: string,
  status: ProgramStatus,
  createdAt: string,
): Program {
  return { id, title, owner, status, createdAt, created_by: AUTHOR };
}

function defineProgramRepositoryContract(
  label: string,
  build: (seed?: Program[]) => IProgramRepository,
) {
  describe(`IProgramRepository contract: ${label}`, () => {
    let repo: IProgramRepository;

    beforeEach(() => {
      repo = build();
    });

    it("lista vazia no início", async () => {
      expect(await repo.listAll()).toEqual([]);
    });

    it("listAll ordena por created_at desc (mais novo primeiro)", async () => {
      const seeded = build([
        makeProgram(
          "p-1",
          "Ficha antiga",
          OWNER_A,
          "inativo",
          "2026-01-05T10:00:00.000Z",
        ),
        makeProgram(
          "p-2",
          "Ficha do meio",
          OWNER_A,
          "rascunho",
          "2026-03-10T10:00:00.000Z",
        ),
        makeProgram(
          "p-3",
          "Ficha nova",
          OWNER_B,
          "ativo",
          "2026-05-20T10:00:00.000Z",
        ),
      ]);
      const listed = await seeded.listAll();
      expect(listed.map((p) => p.id)).toEqual(["p-3", "p-2", "p-1"]);
      // Mistura de status não muda a ordenação (é por data de criação).
      expect(listed.map((p) => p.status)).toEqual([
        "ativo",
        "rascunho",
        "inativo",
      ]);
    });

    it("create insere com status default 'rascunho'", async () => {
      const created = await repo.create({
        title: "Ficha de verão",
        owner: OWNER_A,
      });
      expect(created.id).toBeDefined();
      expect(created.title).toBe("Ficha de verão");
      expect(created.owner).toBe(OWNER_A);
      expect(created.status).toBe("rascunho");
      const listed = await repo.listAll();
      expect(listed).toHaveLength(1);
      expect(listed[0].id).toBe(created.id);
    });

    it("update de título funciona e persiste", async () => {
      const created = await repo.create({
        title: "Título original",
        owner: OWNER_A,
      });
      const updated = await repo.update(created.id, {
        title: "Título corrigido",
      });
      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe("Título corrigido");
      expect(updated.status).toBe("rascunho");
      const found = await repo.findById(created.id);
      expect(found?.title).toBe("Título corrigido");
      expect(await repo.listAll()).toHaveLength(1);
    });

    it("update para 'ativo' desativa o anterior ativo do mesmo dono (outro dono e não-ativos intactos)", async () => {
      const seeded = build([
        makeProgram(
          "a-1",
          "A ativo anterior",
          OWNER_A,
          "ativo",
          "2026-01-01T00:00:00.000Z",
        ),
        makeProgram(
          "a-2",
          "A rascunho novo",
          OWNER_A,
          "rascunho",
          "2026-06-01T00:00:00.000Z",
        ),
        makeProgram(
          "a-3",
          "A inativo histórico",
          OWNER_A,
          "inativo",
          "2026-03-01T00:00:00.000Z",
        ),
        makeProgram(
          "b-1",
          "B ativo",
          OWNER_B,
          "ativo",
          "2026-02-01T00:00:00.000Z",
        ),
      ]);

      const updated = await seeded.update("a-2", { status: "ativo" });
      expect(updated.status).toBe("ativo");

      const statusOf = async (id: string) =>
        (await seeded.findById(id))?.status;
      expect(await statusOf("a-1")).toBe("inativo"); // anterior do MESMO dono
      expect(await statusOf("a-2")).toBe("ativo"); // novo ativo
      expect(await statusOf("a-3")).toBe("inativo"); // não-ativo intacto
      expect(await statusOf("b-1")).toBe("ativo"); // outro dono intacto
    });

    it("ativar um programa antigo não altera a ordenação por data de criação", async () => {
      const seeded = build([
        makeProgram(
          "old",
          "Programa antigo",
          OWNER_A,
          "inativo",
          "2026-01-01T00:00:00.000Z",
        ),
        makeProgram(
          "mid",
          "Programa do meio",
          OWNER_A,
          "rascunho",
          "2026-03-01T00:00:00.000Z",
        ),
        makeProgram(
          "active",
          "Programa vigente",
          OWNER_A,
          "ativo",
          "2026-06-01T00:00:00.000Z",
        ),
      ]);
      expect((await seeded.listAll()).map((p) => p.id)).toEqual([
        "active",
        "mid",
        "old",
      ]);

      // Reativação (inativo → ativo) do mais antigo.
      await seeded.update("old", { status: "ativo" });

      expect((await seeded.listAll()).map((p) => p.id)).toEqual([
        "active",
        "mid",
        "old",
      ]);
      expect((await seeded.findById("old"))?.status).toBe("ativo");
      expect((await seeded.findById("active"))?.status).toBe("inativo");
    });

    it("delete remove por id", async () => {
      const created = await repo.create({
        title: "Rascunho descartável",
        owner: OWNER_A,
      });
      const other = await repo.create({
        title: "Outro rascunho",
        owner: OWNER_B,
      });

      await repo.delete(created.id);

      expect(await repo.findById(created.id)).toBeNull();
      const listed = await repo.listAll();
      expect(listed.map((p) => p.id)).toEqual([other.id]);
    });

    it("findActiveByOwner retorna o ativo do dono ou null", async () => {
      const seeded = build([
        makeProgram(
          "a-1",
          "A ativo",
          OWNER_A,
          "ativo",
          "2026-01-01T00:00:00.000Z",
        ),
        makeProgram(
          "a-2",
          "A rascunho",
          OWNER_A,
          "rascunho",
          "2026-02-01T00:00:00.000Z",
        ),
        makeProgram(
          "b-1",
          "B rascunho",
          OWNER_B,
          "rascunho",
          "2026-03-01T00:00:00.000Z",
        ),
      ]);

      const active = await seeded.findActiveByOwner(OWNER_A);
      expect(active?.id).toBe("a-1");
      expect(active?.status).toBe("ativo");
      expect(active?.owner).toBe(OWNER_A);

      // Dono sem nenhum programa ativo → null.
      expect(await seeded.findActiveByOwner(OWNER_B)).toBeNull();
    });

    it("findById encontra por id e devolve null para id desconhecido", async () => {
      const created = await repo.create({
        title: "Programa único",
        owner: OWNER_A,
      });
      const found = await repo.findById(created.id);
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe("Programa único");
      expect(await repo.findById("id-que-nao-existe")).toBeNull();
    });

    it("forçar dois ativos do mesmo dono lança erro amigável", () => {
      // Forçamento: seed carrega estado que violaria o índice parcial único
      // (nunca alcançável pela API, que desativa o anterior) — o fake precisa
      // recusar com a mensagem amigável do plan.md §5.
      expect(() =>
        build([
          makeProgram(
            "x-1",
            "A ativo um",
            OWNER_A,
            "ativo",
            "2026-01-01T00:00:00.000Z",
          ),
          makeProgram(
            "x-2",
            "A ativo dois",
            OWNER_A,
            "ativo",
            "2026-02-01T00:00:00.000Z",
          ),
        ]),
      ).toThrow(UNICITY_MESSAGE);
    });
  });
}

defineProgramRepositoryContract(
  "fake em memória",
  (seed: Program[] = []) => createFakeProgramRepository(seed),
);
