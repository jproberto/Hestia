import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RestPushEnableHint from "@/components/milon/RestPushEnableHint";

/**
 * Contrato RED — Mílon #06 Timer de descanso auto + PWA push (TASK-009):
 * `components/milon/RestPushEnableHint.tsx` (ainda INEXISTENTE).
 *
 * Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/plan.md`
 * §3 "Componentes presentacionais" (RestPushEnableHint — props e textos
 * congelados) + §"Textos congelados (sem paráfrase)" + §5 DA15 (some com
 * permissão negada, linha de iPhone não-instalado, nada bloqueia) +
 * `tasks.json` TASK-009 (acceptanceCriteria).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/components/milon/RestPushEnableHint` ainda não existe — Expected: FAIL
 * com falha de coleta "Cannot find module" (acceptanceCriteria 1 da
 * TASK-009). Hefesto fará GREEN (TASK-010) apenas com o contrato do plano.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — RestPushEnableHint):
 * - props: `supported: boolean`, `permission: "default" | "granted" |
 *   "denied" | "unsupported"`, `isStandalone: boolean`, `isIOS: boolean`,
 *   `requesting: boolean`, `onRequest: () => void`;
 * - renderiza `null` salvo com suporte E permissão `default` (sem prompt
 *   agressivo; some com granted/denied — degradação silenciosa);
 * - com permissão `default`: texto base
 *   `Ative os avisos para receber o fim do descanso com a tela apagada.` e
 *   botão `Ativar avisos de descanso` que dispara `onRequest` no clique (o
 *   gesto — a API de permissão nunca é chamada fora dele);
 * - quando `isIOS && !isStandalone`: linha
 *   `No iPhone, adicione o Héstia à Tela Inicial para receber avisos com a tela apagada.`;
 * - nenhuma marcação depende do hint (componente puramente presentacional).
 *
 * Tipo de props declarado localmente: o teste só depende do default export
 * (precedente de WorkoutConfirmModal.test.tsx).
 */

type PushPermission = "default" | "granted" | "denied" | "unsupported";

interface RestPushEnableHintProps {
  supported: boolean;
  permission: PushPermission;
  isStandalone: boolean;
  isIOS: boolean;
  requesting: boolean;
  onRequest: () => void;
}

// Textos congelados (plan.md §3 — nunca paraphrasear).
const TEXTO_BASE =
  "Ative os avisos para receber o fim do descanso com a tela apagada.";
const BOTAO_ATIVAR = "Ativar avisos de descanso";
const LINHA_IPHONE =
  "No iPhone, adicione o Héstia à Tela Inicial para receber avisos com a tela apagada.";

function base(
  overrides: Partial<RestPushEnableHintProps> = {},
): RestPushEnableHintProps {
  return {
    supported: true,
    permission: "default",
    isStandalone: false,
    isIOS: false,
    requesting: false,
    onRequest: vi.fn(),
    ...overrides,
  };
}

function renderHint(props: RestPushEnableHintProps) {
  return render(<RestPushEnableHint {...props} />);
}

/** Texto visível do hint (independe da estrutura interna de elementos). */
function texto(): string {
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("Mílon #06 — RestPushEnableHint (contrato RED, TASK-009)", () => {
  // -------------------------------------------------------------------------
  // 1. Renderização condicional → null
  // -------------------------------------------------------------------------
  describe("renderiza null salvo com suporte e permissão default", () => {
    it("sem suporte à API de notificação renderiza null", () => {
      const { container } = renderHint(
        base({ supported: false, permission: "unsupported" }),
      );

      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("button", { name: BOTAO_ATIVAR })).toBeNull();
    });

    it("com permissão granted renderiza null (já ativado — sem hint)", () => {
      const { container } = renderHint(base({ permission: "granted" }));

      expect(container).toBeEmptyDOMElement();
      expect(texto()).not.toContain(TEXTO_BASE);
    });

    it("com permissão denied renderiza null (degradação silenciosa)", () => {
      const { container } = renderHint(base({ permission: "denied" }));

      expect(container).toBeEmptyDOMElement();
      expect(texto()).not.toContain(TEXTO_BASE);
      expect(texto()).not.toContain(BOTAO_ATIVAR);
      expect(texto()).not.toContain(LINHA_IPHONE);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Permissão default → texto base + gesto no botão
  // -------------------------------------------------------------------------
  describe("com suporte e permissão default", () => {
    it("exibe o texto base exato", () => {
      renderHint(base());

      expect(texto()).toContain(TEXTO_BASE);
    });

    it("exibe o botão exato 'Ativar avisos de descanso'", () => {
      renderHint(base());

      expect(
        screen.getByRole("button", { name: BOTAO_ATIVAR }),
      ).toBeInTheDocument();
    });

    it("o clique no botão invoca onRequest exatamente uma vez (o gesto)", () => {
      const onRequest = vi.fn();
      renderHint(base({ onRequest }));

      fireEvent.click(screen.getByRole("button", { name: BOTAO_ATIVAR }));
      expect(onRequest).toHaveBeenCalledTimes(1);
    });

    it("sem clique nenhum onRequest é disparada (permissão nunca é pedida fora do gesto)", () => {
      const onRequest = vi.fn();
      renderHint(base({ onRequest }));

      expect(onRequest).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 3. Linha de iPhone não-instalado (isIOS && !isStandalone)
  // -------------------------------------------------------------------------
  describe("instrução de instalação no iPhone", () => {
    it("com isIOS verdadeiro e isStandalone falso exibe a linha exata de Adicionar à Tela Inicial", () => {
      renderHint(base({ isIOS: true, isStandalone: false }));

      expect(texto()).toContain(LINHA_IPHONE);
    });

    it("com isIOS e isStandalone (app instalado) NÃO exibe a linha de instalação", () => {
      renderHint(base({ isIOS: true, isStandalone: true }));

      expect(texto()).not.toContain(LINHA_IPHONE);
    });

    it("sem isIOS (desktop/android) não exibe a linha de instalação", () => {
      renderHint(base({ isIOS: false, isStandalone: false }));

      expect(texto()).not.toContain(LINHA_IPHONE);
    });

    it("a linha de instalação aparece junto do texto base e do botão", () => {
      renderHint(base({ isIOS: true, isStandalone: false }));

      expect(texto()).toContain(TEXTO_BASE);
      expect(texto()).toContain(LINHA_IPHONE);
      expect(
        screen.getByRole("button", { name: BOTAO_ATIVAR }),
      ).toBeInTheDocument();
    });
  });
});
