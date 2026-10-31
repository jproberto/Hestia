import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RestTimerPanel from "@/components/milon/RestTimerPanel";

/**
 * Contrato RED — Mílon #06 Timer de descanso auto + PWA push (TASK-009):
 * `components/milon/RestTimerPanel.tsx` (ainda INEXISTENTE).
 *
 * Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/plan.md`
 * §3 "Componentes presentacionais" (props e textos congelados) + §"Textos
 * congelados (sem paráfrase)" + `tasks.json` TASK-009 (acceptanceCriteria).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/components/milon/RestTimerPanel` ainda não existe — Expected: FAIL com
 * falha de coleta "Cannot find module" (acceptanceCriteria 1 da TASK-009).
 * Hefesto fará GREEN (TASK-010) apenas com o contrato do plano — sem
 * inventar APIs e sem paraphrasear os textos.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — RestTimerPanel):
 * - props: `exerciseName: string | null`, `remainingSeconds: number | null`,
 *   `finished: boolean`, `onDismiss: () => void`;
 * - com `finished` verdadeiro: alerta `role="alert"` com o texto congelado
 *   `Descanso de <exercício> terminou.` (ou `O descanso terminou.` sem nome)
 *   e botão `Fechar` que chama `onDismiss`;
 * - sem `finished` e com contagem: cartão `role="status"` com o rótulo
 *   `Descanso — <exercício>` e o `mm:ss` de `formatarContagemDescanso`
 *   (90 → "01:30", 5 → "00:05");
 * - caso contrário (sem contagem e sem fim): renderiza `null`;
 * - sem som, sem vibração, sem modal, sem navegação (decisão 1 — asserções
 *   de áudio/vibração ficam fora do escopo do teste por serem ausência de
 *   efeito colateral; o contrato de props não as permite).
 *
 * Tipo de props declarado localmente: o contrato do plano não exige export
 * de tipo do componente — o teste só depende do default export (precedente
 * de WorkoutConfirmModal.test.tsx).
 */

interface RestTimerPanelProps {
  exerciseName: string | null;
  remainingSeconds: number | null;
  finished: boolean;
  onDismiss: () => void;
}

// Textos congelados (plan.md §3 — nunca paraphrasear).
const EXERCICIO = "Supino reto";
const ROTULO_CONTAGEM = `Descanso — ${EXERCICIO}`;
const ALERTA_COM_NOME = `Descanso de ${EXERCICIO} terminou.`;
const ALERTA_SEM_NOME = "O descanso terminou.";
const BOTAO_FECHAR = "Fechar";

function base(
  overrides: Partial<RestTimerPanelProps> = {},
): RestTimerPanelProps {
  return {
    exerciseName: EXERCICIO,
    remainingSeconds: 90,
    finished: false,
    onDismiss: vi.fn(),
    ...overrides,
  };
}

function renderPainel(props: RestTimerPanelProps) {
  return render(<RestTimerPanel {...props} />);
}

/** Texto visível do painel (independe da estrutura interna de elementos). */
function texto(): string {
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("Mílon #06 — RestTimerPanel (contrato RED, TASK-009)", () => {
  // -------------------------------------------------------------------------
  // 1. Contagem rodando (role="status")
  // -------------------------------------------------------------------------
  describe("contagem rodando (role status)", () => {
    it("exibe o rótulo exato 'Descanso — <exercício>' e o mm:ss em elemento com role status", () => {
      renderPainel(base({ exerciseName: EXERCICIO, remainingSeconds: 90 }));

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent(ROTULO_CONTAGEM);
      expect(status).toHaveTextContent("01:30");
    });

    it("formata a contagem restante em mm:ss (5 segundos → 00:05)", () => {
      renderPainel(base({ exerciseName: EXERCICIO, remainingSeconds: 5 }));

      expect(screen.getByRole("status")).toHaveTextContent("00:05");
    });

    it("sem nome de exercício a contagem ainda aparece no role status (mm:ss)", () => {
      renderPainel(
        base({ exerciseName: null, remainingSeconds: 90, finished: false }),
      );

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("01:30");
    });

    it("não exibe o alerta de fim enquanto a contagem roda", () => {
      renderPainel(base({ finished: false, remainingSeconds: 90 }));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: BOTAO_FECHAR })).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Fim do descanso (role="alert")
  // -------------------------------------------------------------------------
  describe("fim do descanso (role alert)", () => {
    it("com nome exibe o alerta exato 'Descanso de <exercício> terminou.' em role alert", () => {
      renderPainel(
        base({ exerciseName: EXERCICIO, remainingSeconds: 0, finished: true }),
      );

      const alerta = screen.getByRole("alert");
      expect(alerta).toHaveTextContent(ALERTA_COM_NOME);
    });

    it("sem nome exibe o alerta exato 'O descanso terminou.'", () => {
      renderPainel(
        base({ exerciseName: null, remainingSeconds: 0, finished: true }),
      );

      expect(screen.getByRole("alert")).toHaveTextContent(ALERTA_SEM_NOME);
    });

    it("exibe o botão 'Fechar' que invoca onDismiss exatamente uma vez", () => {
      const onDismiss = vi.fn();
      renderPainel(base({ finished: true, remainingSeconds: 0, onDismiss }));

      fireEvent.click(screen.getByRole("button", { name: BOTAO_FECHAR }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("com finished não exibe o cartão de contagem (role status ausente)", () => {
      renderPainel(base({ finished: true, remainingSeconds: 0 }));

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("o alerta nunca paraphraseia o texto congelado (sem variação livre)", () => {
      renderPainel(
        base({ exerciseName: EXERCICIO, remainingSeconds: 0, finished: true }),
      );

      // O texto visível contém a frase exata; nenhuma alternativa aparece.
      expect(texto()).toContain(ALERTA_COM_NOME);
      expect(texto()).not.toContain("Descanso finalizado");
      expect(texto()).not.toContain("Tempo esgotado");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Sem contagem e sem fim → null
  // -------------------------------------------------------------------------
  describe("estado vazio", () => {
    it("sem contagem e sem fim renderiza null (container vazio)", () => {
      const { container } = renderPainel(
        base({ exerciseName: EXERCICIO, remainingSeconds: null, finished: false }),
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("sem contagem e sem fim não expõe botão Fechar", () => {
      const onDismiss = vi.fn();
      renderPainel(
        base({ exerciseName: null, remainingSeconds: null, finished: false, onDismiss }),
      );

      expect(screen.queryByRole("button", { name: BOTAO_FECHAR })).toBeNull();
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });
});
