/**
 * TASK-030 (Mílon #2, Patch v5) — CONTRATO RED da casa única da união de origens.
 *
 * Fonte do contrato: spec.md "Patch v5" (D26, R29) + plan.md §1 "Casa da união de
 * origens" e §3 "Contratos do Patch v5" + tasks.json (TASK-030 / TASK-031).
 *
 * Consome (ainda inexistente): lib/shared/error-origin.ts exportando `ErrorOrigin`,
 * o re-export no barrel lib/shared/index.ts e o apelido `ProgramErrorOrigin` em
 * lib/milon/types.ts (hoje a união literal ainda está escrita à mão na linha 38).
 * Torna verde: TASK-031 (Hefesto) — sem tocar em produção nesta task.
 *
 * Expected: FAIL hoje — a casa em lib/shared não existe e a união inline permanece
 * em lib/milon/types.ts (condição de RED da TASK-031).
 * Os checks em tempo de compilação (literais aceitos, @ts-expect-error e identidade
 * bidirecional) são apurados por `npx tsc --noEmit`, critério da TASK-031.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

import type { ErrorOrigin } from "@/lib/shared";
import type { ProgramErrorOrigin } from "@/lib/milon/types";

/** Raiz do projeto (mesmo padrão de leitura de page.test.tsx / MascotProvider.test.tsx). */
const RAIZ = path.resolve(__dirname, "../../..");

function lerArquivo(relativo: string): string {
  return fs.readFileSync(path.join(RAIZ, relativo), "utf8");
}

const TRES_LITERAIS = ["carga", "operacao", "bloqueio"];

describe("TASK-030 — casa única da união de origens (D26, R29) em disco", () => {
  it("lib/shared/error-origin.ts existe e exporta ErrorOrigin com exatamente os três literais", () => {
    const caminho = path.join(RAIZ, "lib/shared/error-origin.ts");
    if (!fs.existsSync(caminho)) {
      expect.fail(
        "lib/shared/error-origin.ts não existe — a casa única da união de origens (D26) ainda não foi criada (RED da TASK-031)",
      );
    }

    const fonte = lerArquivo("lib/shared/error-origin.ts");
    const linha = fonte
      .split("\n")
      .find((l) => /export\s+type\s+ErrorOrigin\b/.test(l));
    expect(linha, "error-origin.ts exporta o tipo ErrorOrigin").toBeDefined();

    const literais = (linha!.match(/['"][a-z]+['"]/g) ?? []).map((s) => s.slice(1, -1));
    // Exatamente os três literais, nenhum quarto valor.
    expect(new Set(literais)).toEqual(new Set(TRES_LITERAIS));
    expect(literais).toHaveLength(3);
  });

  it("o barrel lib/shared/index.ts re-exporta o módulo error-origin", () => {
    const barrel = lerArquivo("lib/shared/index.ts");
    expect(barrel).toMatch(
      /export\s+(?:\*|\{[^}]*\})\s+from\s+["']\.\/error-origin["']/,
    );
  });

  it("lib/milon/types.ts não tem mais a união literal escrita à mão (busca carga|operacao = 0)", () => {
    const fonte = lerArquivo("lib/milon/types.ts");
    const ocorrencias =
      fonte.match(/['"]?\bcarga['"]?\s*\|\s*['"]?\boperacao['"]?/g) ?? [];
    // Critério textual da TASK-031: 0 ocorrências enquanto a definição literal estiver no arquivo.
    expect(ocorrencias).toHaveLength(0);
  });

  it("ProgramErrorOrigin continua exportado de lib/milon/types.ts como apelido de ErrorOrigin", () => {
    const fonte = lerArquivo("lib/milon/types.ts");

    // Nenhum importador existente quebra: o nome segue exportado de lá (R29).
    expect(fonte).toMatch(/export\s+type\s+ProgramErrorOrigin\b/);

    // Apelido (=) do tipo compartilhado — não uma definição própria.
    const ehApelido =
      /export\s+type\s+ProgramErrorOrigin\s*=\s*ErrorOrigin\b/.test(fonte) ||
      /export\s*\{[^}]*\bErrorOrigin\s+as\s+ProgramErrorOrigin\b[^}]*\}/.test(fonte);
    expect(ehApelido, "ProgramErrorOrigin é apelido de ErrorOrigin").toBe(true);

    // A casa é o barrel @/lib/shared (plan §1 — precedente lib/pluto/types.ts).
    expect(fonte).toMatch(/from\s+["']@\/lib\/shared["']/);
  });
});

describe("TASK-030 — tempo de compilação (apurado por npx tsc --noEmit)", () => {
  it("os três literais válidos são aceitos por ErrorOrigin e pelo apelido ProgramErrorOrigin", () => {
    const carga: ErrorOrigin = "carga";
    const operacao: ErrorOrigin = "operacao";
    const bloqueio: ErrorOrigin = "bloqueio";

    const milonCarga: ProgramErrorOrigin = "carga";
    const milonOperacao: ProgramErrorOrigin = "operacao";
    const milonBloqueio: ProgramErrorOrigin = "bloqueio";

    expect([carga, operacao, bloqueio]).toEqual(TRES_LITERAIS);
    expect([milonCarga, milonOperacao, milonBloqueio]).toEqual(TRES_LITERAIS);
  });

  it("identidade de tipo: atribuição mútua nas duas direções sem cast", () => {
    const origemShared: ErrorOrigin = "bloqueio";
    // ErrorOrigin -> ProgramErrorOrigin, sem cast (mesmo tipo, não dois tipos parecidos).
    const origemMilon: ProgramErrorOrigin = origemShared;
    // ProgramErrorOrigin -> ErrorOrigin, sem cast.
    const voltaShared: ErrorOrigin = origemMilon;

    expect(origemMilon).toBe("bloqueio");
    expect(voltaShared).toBe("bloqueio");
  });

  it("um quarto literal qualquer não é atribuível a nenhum dos dois tipos", () => {
    // @ts-expect-error — 'ambiguo' fora da união ErrorOrigin (casa única)
    const invalidaShared: ErrorOrigin = "ambiguo";
    // @ts-expect-error — 'ambiguo' fora da união ProgramErrorOrigin (apelido)
    const invalidaMilon: ProgramErrorOrigin = "ambiguo";

    expect(invalidaShared).toBe("ambiguo");
    expect(invalidaMilon).toBe("ambiguo");
  });
});
