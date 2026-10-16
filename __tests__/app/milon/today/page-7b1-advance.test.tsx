import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { useState } from "react";
import TodayPage from "@/app/milon/today/page";
import { useTodayWorkout } from "@/lib/milon/hooks/useTodayWorkout";
import { useActiveExecution } from "@/lib/milon/hooks/useActiveExecution";
import type { Program, Workout } from "@/lib/milon/types";

/**
 * Contrato RED — Mílon 07b-1 Avançar para o próximo treino (TASK-003):
 * composição da página do Treino do Dia por desfecho de assentamento.
 *
 * Fonte: `.agents/modules/milon/07b-1-avancar-proximo-treino/spec.md` §5
 * (critérios 1 a 8) + §2 (estados de tela e foco) + `plan.md` §3
 * (comportamento da página: `sealed` ⇒ invalidar a fonte única AGUARDADA e
 * então recarregar a seleção — DA4; `cancelled` ⇒ somente a fonte única —
 * DA2; sinal de foco nos dois — DA5) + §4 (data flow 6, 7, 9, 10) +
 * `tasks.json` TASK-003 (acceptanceCriteria).
 *
 * PRODUÇÃO SOB TESTE (lida em disco): `app/milon/today/page.tsx:33` —
 * `handleExecutionSettled = () => void retryActiveExecution?.()`: hoje a
 * página SÓ invalida a fonte única (entrega 7c AC6), sem ramificar por
 * desfecho, sem recarregar a seleção e sem `focusHeaderSignal`. Assinatura
 * nova da seção (já GREEN, commit 6813e68): `onExecutionSettled(desfecho:
 * 'sealed' | 'cancelled')` + `focusHeaderSignal?: number | null`.
 *
 * O que se trava aqui é a decisão da PÁGINA — não o interior da seção
 * (travado em WorkoutDetailSection.test.tsx), nem o recálculo da rotação
 * (travado em useTodayWorkout-rotation.test.ts), nem a guarda/liberação de
 * escrita da 7c (travada em page-ac6.test.tsx):
 *
 *  1. desfecho `sealed` → ordem AGUARDADA: `retry` de `useActiveExecution`
 *     (fonte única) conclui ANTES de o `retry` de `useTodayWorkout`
 *     (seleção) começar (DA4), a seleção nova vem exclusivamente do
 *     recálculo do hook (nunca `selectWorkout`) e o `focusHeaderSignal`
 *     passado à seção é incrementado (spec §5-1/2/3);
 *  2. desfecho `cancelled` → SOMENTE o `retry` da fonte única é chamado,
 *     o sinal de foco é incrementado e o `workoutId` selecionado é
 *     preservado (mesma seção, mesmo treino — spec §5-4/5, DA2);
 *  3. ausência de desfecho (falha da operação: a seção não emite nada,
 *     plan §4-10 / spec §5-8) → nenhum retry de seleção nem de fonte
 *     única, nenhum avanço;
 *  3b. chamada SEM argumento (retrocompat 7c, plan DA3 + JSDoc da seção)
 *     → não-selamento: SOMENTE a fonte única é invalidada (mantém a
 *     semântica da 7c AC6 — page-ac6.test.tsx — verde);
 *  4. falha da recarga de seleção após `sealed` → `AsyncState` exibe a
 *     mensagem com NOVA TENTATIVA (origem `carga`) e NENHUM treino parcial
 *     é exibido até carregar (spec §5-7 / plan §4-9);
 *  5. sem programa ativo ou programa sem treinos → o vazio herdado da 04
 *     e da 7b segue sem erro e sem avanço (spec §5-6, regressão).
 *
 * Isolamento no padrão do precedente `page-ac6.test.tsx`: mocks por arquivo
 * de `next/navigation`, dos dois hooks, da seção e do switcher; factories
 * com defaults; `clickConnectedButton` para clique pós-fetch. O mock da
 * seção EMITE o desfecho nos botões (paridade com a seção GREEN) e no
 * botão de falha NÃO emite (o caminho de erro da seção nunca chama
 * `onExecutionSettled`). O mock de `useTodayWorkout.retry` reproduz o
 * contrato real do hook: no caso feliz recalcula a seleção (vizinho
 * seguinte com volta ao primeiro) e, na falha gravada, o hook real ENGOLE o
 * erro dentro do próprio `fetchSelection` (useTodayWorkout.ts try/catch →
 * `errorMsg` + origem `carga`, promessa resolvida) — daí o mock resolver
 * gravando o estado em vez de rejeitar.
 *
 * Ordem da fonte única é verificada com resolução ATARDADA (20ms) para
 * travar o "aguardada antes" do DA4: um chamador que dispare as duas sem
 * esperar produz ordem errada e falha.
 *
 * Expected: FAIL hoje — casos 1, 2 e 4 falham pelo motivo certo (página só
 * invalida a fonte única, sem ramificar nem recarregar seleção, sem sinal
 * de foco); casos 3, 3b e 5 são travas de regressão que já passam. `npx
 * tsc --noEmit` → exit 0. NENHUM arquivo de produção é tocado.
 */

const mockUsePathname = vi.hoisted(() => vi.fn(() => "/milon/today"));
const mockPush = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useParams: vi.fn(() => ({})),
  usePathname: mockUsePathname,
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({ get: vi.fn() })),
}));

vi.mock("@/lib/milon/hooks/useTodayWorkout", () => ({
  useTodayWorkout: vi.fn(),
}));

vi.mock("@/lib/milon/hooks/useActiveExecution", () => ({
  useActiveExecution: vi.fn(),
}));

type Desfecho = "sealed" | "cancelled";

// Seção mockada por arquivo: registra as props da página (workoutId,
// onExecutionSettled, focusHeaderSignal) e EMITE o desfecho como a seção
// GREEN faz (sealed no Finalizar, cancelled no Cancelar). O botão de
// simulação de falha NÃO invoca nada — é o caminho de erro da seção
// (plan §4-10: nenhum desfecho emitido).
interface PropsDaSecao {
  workoutId?: string;
  onExecutionSettled?: (outcome?: Desfecho) => void | Promise<void>;
  focusHeaderSignal?: number | null;
}

vi.mock("@/components/milon/WorkoutDetailSection", () => ({
  WorkoutDetailSection: vi.fn((props: PropsDaSecao) => (
    <div
      data-testid="secao-detalhe"
      data-workout-id={props.workoutId ?? ""}
      data-focus-signal={
        props.focusHeaderSignal === undefined || props.focusHeaderSignal === null
          ? ""
          : String(props.focusHeaderSignal)
      }
    >
      <button
        type="button"
        onClick={() => {
          void props.onExecutionSettled?.("sealed");
        }}
      >
        Finalizar
      </button>
      <button
        type="button"
        onClick={() => {
          void props.onExecutionSettled?.("cancelled");
        }}
      >
        Cancelar
      </button>
      <button type="button" onClick={() => undefined}>
        Simular falha de operação
      </button>
    </div>
  )),
}));

vi.mock("@/components/milon/TodayWorkoutSwitcher", () => ({
  TodayWorkoutSwitcher: vi.fn(
    (props: {
      workouts?: { id: string; name: string }[];
      selectedWorkoutId?: string | null;
      onSelect?: (workoutId: string) => void;
    }) => (
      <label>
        Treino
        <select
          aria-label="Treino"
          value={props.selectedWorkoutId ?? ""}
          onChange={(e) => props.onSelect?.(e.target.value)}
        >
          {(props.workouts ?? []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
    ),
  ),
}));

import { WorkoutDetailSection as MockedSection } from "@/components/milon/WorkoutDetailSection";

const mockedUseTodayWorkout = useTodayWorkout as Mock;
const mockedUseActiveExecution = useActiveExecution as Mock;

const DONO = "ana@hestia.lan";

/**
 * Ordem global das chamadas de retry observada pelos testes. A fonte única
 * empurra `fonte:inicio` síncrono e `fonte:fim` só após 20ms (resolução
 * atardada), de modo que a sequência exigida do avanço é exatamente
 * ["fonte:inicio", "fonte:fim", "selecao"] — o que só acontece se a página
 * AGUARDAR a invalidação antes de recarregar a seleção (plan DA4).
 */
type Passo = "fonte:inicio" | "fonte:fim" | "selecao";
const ordem: Passo[] = [];

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    id: "prog-1",
    title: "Ficha Verão 2026",
    owner: DONO,
    status: "ativo",
    createdAt: "2026-09-29T00:00:00Z",
    created_by: DONO,
    ...overrides,
  };
}

function makeWorkout(overrides: Partial<Workout> & { id: string }): Workout {
  return {
    programId: "prog-1",
    name: "Treino A",
    createdAt: "2026-10-01T00:00:00Z",
    created_by: DONO,
    ...overrides,
  };
}

function treinosAeB(): Workout[] {
  return [
    makeWorkout({ id: "w-1", name: "Treino A" }),
    makeWorkout({
      id: "w-2",
      name: "Treino B",
      createdAt: "2026-10-01T11:00:00Z",
    }),
  ];
}

interface ConfigHoje {
  program?: Program | null;
  workouts?: Workout[];
  initialSelected?: string | null;
  /**
   * Comportamento do `retry` de seleção (o hook real recalcula no caso
   * feliz e, na falha, grava `errorMsg` + origem `carga` e resolve — ver
   * `fetchSelection` em useTodayWorkout.ts). Default: recálculo da
   * rotação (vizinho seguinte com volta ao primeiro).
   */
  onRetrySelecao?: (api: {
    setSelected: (id: string | null) => void;
    failCarga: (mensagem: string) => void;
  }) => void | Promise<void>;
}

/**
 * Seleção com `useState` real (mesmo padrão de `page.test.tsx`/
 * `page-ac6.test.tsx`): troca de selecionado re-renderiza a página.
 */
function setupToday(
  cfg: ConfigHoje = {},
): { selectWorkout: Mock; retrySelecao: Mock } {
  const program = cfg.program !== undefined ? cfg.program : makeProgram();
  const workouts = cfg.workouts !== undefined ? cfg.workouts : treinosAeB();
  const inicial =
    cfg.initialSelected !== undefined
      ? cfg.initialSelected
      : (workouts[0]?.id ?? null);
  const selectWorkout = vi.fn();
  const retrySelecao = vi.fn();

  mockedUseTodayWorkout.mockImplementation(function useTodayWorkoutMock() {
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
      inicial,
    );
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [errorOrigin, setErrorOrigin] = useState<"carga" | null>(null);
    return {
      program,
      workouts,
      selectedWorkoutId,
      selectWorkout: (workoutId: string) => {
        selectWorkout(workoutId);
        if (workouts.some((w) => w.id === workoutId)) {
          setSelectedWorkoutId(workoutId);
        }
      },
      loading,
      errorMsg,
      errorOrigin,
      successNotice: null,
      retry: async () => {
        retrySelecao();
        ordem.push("selecao");
        if (cfg.onRetrySelecao) {
          await cfg.onRetrySelecao({
            setSelected: setSelectedWorkoutId,
            failCarga: (mensagem: string) => {
              setLoading(false);
              setErrorMsg(mensagem);
              setErrorOrigin("carga");
              setSelectedWorkoutId(null);
            },
          });
          return;
        }
        // Recálculo da rotação 7b: vizinho seguinte com volta ao primeiro.
        setSelectedWorkoutId((atual) => {
          if (atual === null || workouts.length === 0) return atual;
          const i = workouts.findIndex((w) => w.id === atual);
          if (i < 0) return atual;
          return workouts[(i + 1) % workouts.length].id;
        });
      },
    };
  });

  return { selectWorkout, retrySelecao };
}

/**
 * Fonte única de execução ativa: `retry` com resolução atardada (20ms)
 * para que a ordem das chamadas da página revele se ela AGUARDA a
 * invalidação antes de recarregar a seleção (plan DA4).
 */
function setupActive(): Mock {
  const retryFonte = vi.fn(async () => {
    ordem.push("fonte:inicio");
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    ordem.push("fonte:fim");
  });
  mockedUseActiveExecution.mockReturnValue({
    activeExecution: null,
    activeWorkoutId: null,
    loading: false,
    errorMsg: null,
    errorOrigin: null,
    retry: retryFonte,
  });
  return retryFonte;
}

function lastSectionProps(): Record<string, unknown> {
  const mock = MockedSection as unknown as ReturnType<typeof vi.fn>;
  const last = mock.mock.calls.at(-1) as
    | [Record<string, unknown>]
    | undefined;
  return last?.[0] ?? {};
}

/**
 * Clique pós-fetch (padrão `clickConnectedButton` das páginas do módulo):
 * espera o botão conectado antes de clicar.
 */
async function clickConnectedButton(name: string | RegExp): Promise<void> {
  await waitFor(() => {
    const alvo = screen.getByRole("button", { name });
    expect(alvo.isConnected).toBe(true);
  });
  fireEvent.click(screen.getByRole("button", { name }));
}

/** Espera macrotask p/ qualquer handler assíncrono pendente drenar. */
async function drenarAssincrono(ms = 40): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  });
}

async function secaoNoW1(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
      "data-workout-id",
      "w-1",
    );
  });
}

describe("Treino do Dia — composição por desfecho (Mílon 07b-1 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    ordem.length = 0;
    mockUsePathname.mockReturnValue("/milon/today");
  });

  it("desfecho sealed: invalida a fonte única AGUARDA e então recarrega a seleção, e incrementa o focusHeaderSignal", async () => {
    const { selectWorkout } = setupToday();
    const retryFonte = setupActive();

    render(<TodayPage />);

    await secaoNoW1();
    const focoAntes = lastSectionProps()["focusHeaderSignal"] ?? null;

    await clickConnectedButton("Finalizar");

    // DA4: fonte única concluída (fim) ANTES de a seleção começar.
    await waitFor(() => {
      expect(ordem).toEqual(["fonte:inicio", "fonte:fim", "selecao"]);
    });
    expect(retryFonte).toHaveBeenCalledTimes(1);

    // Avanço: a seleção nova vem exclusivamente do recálculo do hook
    // (próximo da rotação 7b), nunca de uma chamada manual a selectWorkout.
    await waitFor(() => {
      expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
        "data-workout-id",
        "w-2",
      );
    });
    expect(lastSectionProps()["workoutId"]).toBe("w-2");
    expect(selectWorkout).not.toHaveBeenCalled();

    // DA5: sinal de foco incrementado e enviado à seção.
    await waitFor(() => {
      expect(typeof lastSectionProps()["focusHeaderSignal"]).toBe("number");
    });
    expect(lastSectionProps()["focusHeaderSignal"]).not.toEqual(focoAntes);
  });

  it("desfecho cancelled: SOMENTE a fonte única é invalidada, com foco incrementado e workoutId preservado", async () => {
    const { selectWorkout } = setupToday();
    const retryFonte = setupActive();

    render(<TodayPage />);

    await secaoNoW1();
    const focoAntes = lastSectionProps()["focusHeaderSignal"] ?? null;

    await clickConnectedButton("Cancelar");

    // DA5: o foco também incrementa no cancelar.
    await waitFor(() => {
      expect(typeof lastSectionProps()["focusHeaderSignal"]).toBe("number");
    });
    expect(lastSectionProps()["focusHeaderSignal"]).not.toEqual(focoAntes);

    // DA2: a seleção é preservada — mesma seção, mesmo treino.
    expect(lastSectionProps()["workoutId"]).toBe("w-1");
    expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
      "data-workout-id",
      "w-1",
    );

    // SOMENTE a fonte única, com a invalidação concluída.
    await waitFor(() => {
      expect(ordem).toEqual(["fonte:inicio", "fonte:fim"]);
    });
    await drenarAssincrono();
    expect(ordem).toEqual(["fonte:inicio", "fonte:fim"]);
    expect(ordem).not.toContain("selecao");
    expect(retryFonte).toHaveBeenCalledTimes(1);
    expect(selectWorkout).not.toHaveBeenCalled();
  });

  it("sem desfecho (falha da operação): nenhum retry de seleção nem de fonte única, sem foco e sem avanço", async () => {
    const { selectWorkout } = setupToday();
    const retryFonte = setupActive();

    render(<TodayPage />);

    await secaoNoW1();
    const focoAntes = lastSectionProps()["focusHeaderSignal"] ?? null;

    // A seção não emite desfecho no caminho de erro (plan §4-10).
    await clickConnectedButton("Simular falha de operação");
    await drenarAssincrono();

    expect(ordem).toEqual([]);
    expect(retryFonte).not.toHaveBeenCalled();
    expect(selectWorkout).not.toHaveBeenCalled();
    expect(lastSectionProps()["focusHeaderSignal"] ?? null).toEqual(focoAntes);
    expect(lastSectionProps()["workoutId"]).toBe("w-1");
    expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
      "data-workout-id",
      "w-1",
    );
  });

  it("chamada sem argumento (retrocompat 7c, DA3): não-selamento invalida SOMENTE a fonte única e preserva o treino", async () => {
    const { selectWorkout } = setupToday();
    const retryFonte = setupActive();

    render(<TodayPage />);

    await secaoNoW1();

    // Forma pré-07b-1 do aviso: chamada sem desfecho (page-ac6.test.tsx
    // invoca assim) — tratada como não-selamento: só a fonte única.
    const semArgumento = lastSectionProps()["onExecutionSettled"] as
      | (() => void | Promise<void>)
      | undefined;
    expect(typeof semArgumento).toBe("function");
    await act(async () => {
      await semArgumento?.();
    });
    await drenarAssincrono();

    expect(ordem).toEqual(["fonte:inicio", "fonte:fim"]);
    expect(retryFonte).toHaveBeenCalledTimes(1);
    expect(selectWorkout).not.toHaveBeenCalled();
    expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
      "data-workout-id",
      "w-1",
    );
  });

  it("falha da recarga de seleção após sealed: AsyncState exibe origem carga com nova tentativa e nenhum treino parcial", async () => {
    const { retrySelecao } = setupToday({
      onRetrySelecao: ({ failCarga }) => {
        failCarga("Erro ao carregar treino do dia");
      },
    });
    setupActive();

    render(<TodayPage />);

    await secaoNoW1();

    await clickConnectedButton("Finalizar");

    // Especificação §5-7 / plan §4-9: falha de carga vira mensagem com
    // nova tentativa pelo estado assíncrono central.
    await waitFor(() => {
      expect(
        screen.getByText(/erro ao carregar treino do dia/i),
      ).toBeInTheDocument();
    });
    // Nenhum treino parcial exibido até carregar.
    expect(screen.queryByTestId("secao-detalhe")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /treino/i }),
    ).not.toBeInTheDocument();

    // A nova tentativa repete a cadeia de seleção (clique pós-fetch).
    await clickConnectedButton(/tentar novamente/i);
    expect(retrySelecao).toHaveBeenCalledTimes(2);
  });
});

describe("Treino do Dia — vazio herdado 04/7b (Mílon 07b-1 — regressão)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    ordem.length = 0;
    mockUsePathname.mockReturnValue("/milon/today");
  });

  it("sem programa ativo: vazio orientador sem erro, sem avanço e sem retry algum", async () => {
    setupToday({ program: null, workouts: [], initialSelected: null });
    setupActive();

    render(<TodayPage />);

    expect(screen.getByText(/sem treino ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/ativar|criar/i)).toBeInTheDocument();
    expect(screen.queryByTestId("secao-detalhe")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(ordem).toEqual([]);
  });

  it("programa ativo sem treinos: vazio orientador adicionar primeiro, sem erro e sem avanço", async () => {
    setupToday({
      program: makeProgram({ status: "ativo" }),
      workouts: [],
      initialSelected: null,
    });
    setupActive();

    render(<TodayPage />);

    expect(screen.getByText(/sem treino ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/adicionar|primeiro/i)).toBeInTheDocument();
    expect(screen.queryByTestId("secao-detalhe")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /tentar novamente/i }),
    ).not.toBeInTheDocument();
    expect(ordem).toEqual([]);
  });
});
