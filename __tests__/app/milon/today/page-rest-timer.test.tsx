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
import {
  useRestTimer,
  type StartRestTimerInput,
  type UseRestTimerReturn,
} from "@/lib/milon/hooks/useRestTimer";
import {
  usePushPermission,
  type UsePushPermissionReturn,
} from "@/lib/milon/hooks/usePushPermission";
import type { Program, Workout } from "@/lib/milon/types";

/**
 * Contrato RED — Mílon 06 Timer de descanso (TASK-011): composição da
 * página do Treino do Dia com o timer de cliente, as ligações dos três
 * eventos da seção e a renderização condicional de painel e hint.
 *
 * Fonte da verdade: `.agents/modules/milon/06-timer-descanso-pwa/`
 * - `plan.md` §1 Mudança 6 — a página liga `onSeriesMarked` →
 *   `restTimer.start`, `onExecutionSettled` (qualquer desfecho, PRIMEIRO
 *   efeito) → `restTimer.cancel`, `onExecutionCleared` →
 *   `restTimer.cancel`; renderiza `RestTimerPanel` somente quando
 *   `originWorkoutId` é o treino selecionado (a troca para consulta não
 *   cancela e não exibe; ao voltar a contagem reaparece de onde parou);
 *   renderiza `RestPushEnableHint` quando aplicável;
 * - `plan.md` §1 Mudança 5 — o hint é renderizado pela PÁGINA quando há
 *   suporte e a permissão ainda é `default` (o stub mockado aqui sempre
 *   renderiza: a página precisa omiti-lo para os casos de ausência
 *   passarem — é a própria condição que se trava);
 * - `plan.md` §3 (contratos) — `useRestTimer` (`active`,
 *   `remainingSeconds`, `originWorkoutId`, `exerciseName`, `finished`,
 *   `start`/`cancel`/`dismiss`), `usePushPermission` (`supported`,
 *   `permission`, …) e as props novas da seção `onSeriesMarked`
 *   (`RestMarkedInfo`)/`onExecutionCleared`;
 * - `tasks.json` TASK-011 `acceptanceCriteria` (casos da página) +
 *   spec §5 critérios 1, 3, 4, 5, 6, 7 e 11.
 *
 * PRODUÇÃO SOB TESTE (lida em disco): `app/milon/today/page.tsx` — NÃO
 * importa `useRestTimer`, `usePushPermission`, `RestTimerPanel` nem
 * `RestPushEnableHint`; não passa `onSeriesMarked` nem
 * `onExecutionCleared` à seção (linha 108-131) e `handleExecutionSettled`
 * (linhas 46-54) só invalida a fonte única e, com `sealed`, recarrega a
 * seleção — sem cancelar timer algum.
 *
 * Isolamento no padrão do precedente `page-7b1-advance.test.tsx`: mocks
 * por arquivo de `next/navigation`, dos dois hooks de seleção/fonte, da
 * seção (EMITE os três eventos nos botões, paridade com a seção GREEN) e
 * do switcher; aqui somam-se os mocks dos módulos NOVOS da 06 (hooks de
 * timer/permissão e os dois presentacionais, stubs por `data-testid`).
 * A ordem de efeitos é verificada com resolução ATARDADA (20ms) da fonte
 * única — um chamador que dispare as recargas sem cancelar antes (hoje)
 * ou que dispare sem aguardar (quebra de DA4) produz ordem errada.
 *
 * Expected: FAIL nos 6 casos de composição/ligação (a página ainda não
 * tem timer, não cancela, não compõe painel nem hint); 4 travas verdes
 * do comportamento que NÃO pode mudar (troca de treino não encerra o
 * timer — emenda 1 do approve-spec; hint ausente com permissão
 * negada/sem suporte — degradação silenciosa DA15). `npx tsc --noEmit`
 * → exit 0 (mocks estruturais, precedente 7b-1). NENHUM arquivo de
 * produção é tocado.
 */

type Desfecho = "sealed" | "cancelled";

interface InfoMarcada {
  workoutId: string;
  entryId: string;
  exerciseName: string;
  restSeconds: number;
}

interface PropsDaSecao {
  workoutId?: string;
  onSeriesMarked?: (info: InfoMarcada) => void;
  onExecutionCleared?: () => void;
  onExecutionSettled?: (outcome?: Desfecho) => void | Promise<void>;
  focusHeaderSignal?: number | null;
}

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

vi.mock("@/lib/milon/hooks/useRestTimer", () => ({
  useRestTimer: vi.fn(),
}));

vi.mock("@/lib/milon/hooks/usePushPermission", () => ({
  usePushPermission: vi.fn(),
}));

// Seção mockada por arquivo: registra as props novas da página e EMITE os
// três eventos como a seção GREEN fará — `onSeriesMarked` com o
// RestMarkedInfo da entry (descanso 90s), `onExecutionSettled` por
// desfecho e `onExecutionCleared` no confirmar da limpeza. Sem as ligações
// da página, os optional-chains não disparam nada (RED).
vi.mock("@/components/milon/WorkoutDetailSection", () => ({
  WorkoutDetailSection: vi.fn((props: PropsDaSecao) => (
    <div
      data-testid="secao-detalhe"
      data-workout-id={props.workoutId ?? ""}
    >
      <button
        type="button"
        onClick={() =>
          props.onSeriesMarked?.({
            workoutId: props.workoutId ?? "",
            entryId: "ent-1",
            exerciseName: "Supino reto",
            restSeconds: 90,
          })
        }
      >
        Marcar série
      </button>
      <button type="button" onClick={() => props.onExecutionCleared?.()}>
        Limpar execução
      </button>
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

// Stubs dos presentacionais NOVOS: sempre renderizam, expondo os props que
// a página deve alimentar/condicionar (o painel por treino de origem, o
// hint pela condição suporte+default da Mudança 5). Exportam default e
// nomeado para aceitar qualquer forma de import da produção.
vi.mock("@/components/milon/RestTimerPanel", () => {
  function Stub(props: {
    exerciseName: string | null;
    remainingSeconds: number | null;
    finished: boolean;
    onDismiss: () => void;
  }) {
    return (
      <div
        data-testid="rest-timer-panel"
        data-remaining-seconds={
          props.remainingSeconds === null ? "" : String(props.remainingSeconds)
        }
        data-finished={String(props.finished)}
        data-exercise-name={props.exerciseName ?? ""}
      />
    );
  }
  return { default: Stub, RestTimerPanel: Stub };
});

vi.mock("@/components/milon/RestPushEnableHint", () => {
  function Stub(props: {
    supported: boolean;
    permission: string;
    onRequest: () => void;
  }) {
    return (
      <div data-testid="rest-push-hint" data-permission={props.permission} />
    );
  }
  return { default: Stub, RestPushEnableHint: Stub };
});

import { WorkoutDetailSection as MockedSection } from "@/components/milon/WorkoutDetailSection";

const mockedUseTodayWorkout = useTodayWorkout as Mock;
const mockedUseActiveExecution = useActiveExecution as Mock;
const mockedUseRestTimer = useRestTimer as Mock;
const mockedUsePushPermission = usePushPermission as Mock;

const DONO = "ana@hestia.lan";

/**
 * Ordem global dos efeitos observada pelos testes de desfecho. O timer
 * empurra `timer:cancel` SÍNCRONO no entry de `cancel`; a fonte única
 * empurra `fonte:inicio` e `fonte:fim` com 20ms de resolução atardada; a
 * seleção empurra `selecao`. O contrato é `timer:cancel` PRIMEIRO, antes
 * das recargas já existentes (plan §1 Mudança 6 / tasks TASK-011 AC).
 */
type Passo = "timer:cancel" | "fonte:inicio" | "fonte:fim" | "selecao";
const ordem: Passo[] = [];

/** Espiões dos dois canais do timer (início único, cancelamento em três). */
const startSpy = vi.fn();
const cancelSpy = vi.fn();

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

/**
 * Seleção com `useState` real (mesmo padrão dos precedentes): troca de
 * selecionado re-renderiza a página; `retry` recalcula a rotação 7b
 * (vizinho seguinte com volta ao primeiro) e registra `selecao`.
 */
function setupToday(
  cfg: {
    program?: Program | null;
    workouts?: Workout[];
    initialSelected?: string | null;
  } = {},
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
    const [loading] = useState(false);
    const [errorMsg] = useState<string | null>(null);
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
      errorOrigin: null,
      successNotice: null,
      retry: async () => {
        retrySelecao();
        ordem.push("selecao");
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
 * para que a ordem revele se a página cancela o timer ANTES das recargas
 * (plan §1 Mudança 6 — primeiro efeito).
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

/** Estado inicial do timer em memória (sobrevive à troca — emenda 1). */
interface EstadoTimer {
  active: boolean;
  remainingSeconds: number | null;
  originWorkoutId: string | null;
  exerciseName: string | null;
  finished: boolean;
}

const timerVazio: EstadoTimer = {
  active: false,
  remainingSeconds: null,
  originWorkoutId: null,
  exerciseName: null,
  finished: false,
};

let timerInicial: EstadoTimer = { ...timerVazio };

/**
 * Timer com `useState` real: o estado nasce de `inicial` (permite testar o
 * painel sem depender do wiring de marcação) e `cancel` registra
 * `timer:cancel` síncrono em `ordem` (é o "primeiro efeito" contratado).
 */
function setupRestTimer(cfg: { inicial?: Partial<EstadoTimer> } = {}): void {
  timerInicial = { ...timerVazio, ...cfg.inicial };
  mockedUseRestTimer.mockImplementation((): UseRestTimerReturn => {
    const [active, setActive] = useState(timerInicial.active);
    const [remainingSeconds, setRemainingSeconds] = useState(
      timerInicial.remainingSeconds,
    );
    const [originWorkoutId, setOriginWorkoutId] = useState(
      timerInicial.originWorkoutId,
    );
    const [exerciseName, setExerciseName] = useState(
      timerInicial.exerciseName,
    );
    const [finished, setFinished] = useState(timerInicial.finished);
    return {
      active,
      remainingSeconds,
      originWorkoutId,
      exerciseName,
      finished,
      start: (input: StartRestTimerInput): void => {
        startSpy(input);
        setActive(true);
        setRemainingSeconds(input.restSeconds);
        setOriginWorkoutId(input.workoutId);
        setExerciseName(input.exerciseName);
        setFinished(false);
      },
      cancel: (): void => {
        cancelSpy();
        ordem.push("timer:cancel");
        setActive(false);
        setRemainingSeconds(null);
        setOriginWorkoutId(null);
        setExerciseName(null);
        setFinished(false);
      },
      dismiss: (): void => {
        setFinished(false);
      },
    };
  });
}

/** Permissão de push configurável por teste (Mudança 5 / DA15). */
function setupPermissao(
  cfg: Partial<UsePushPermissionReturn> = {},
): UsePushPermissionReturn {
  const retorno: UsePushPermissionReturn = {
    supported: true,
    permission: "default",
    isStandalone: false,
    isIOS: false,
    requesting: false,
    requestPermission: vi.fn(async () => {}),
    ...cfg,
  };
  mockedUsePushPermission.mockReturnValue(retorno);
  return retorno;
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

function trocarDeTreino(destino: string): void {
  fireEvent.change(screen.getByRole("combobox", { name: /treino/i }), {
    target: { value: destino },
  });
}

describe("Treino do Dia — ligações do descanso (Mílon 06 TASK-011 — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    ordem.length = 0;
    mockUsePathname.mockReturnValue("/milon/today");
    setupRestTimer();
    setupPermissao();
  });

  // --- Ligações dos três eventos (plan §1 Mudança 6) — casos RED ----------

  it("onSeriesMarked chama restTimer.start com o RestMarkedInfo recebido (critério 1)", async () => {
    setupToday();
    setupActive();

    render(<TodayPage />);
    await secaoNoW1();

    await clickConnectedButton("Marcar série");

    await waitFor(() => expect(startSpy).toHaveBeenCalledTimes(1));
    expect(startSpy).toHaveBeenCalledWith({
      workoutId: "w-1",
      entryId: "ent-1",
      exerciseName: "Supino reto",
      restSeconds: 90,
    });
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it("desfecho sealed: cancela o timer como PRIMEIRO efeito, antes do retry da fonte única e da seleção (critério 6)", async () => {
    const { selectWorkout } = setupToday();
    setupActive();

    render(<TodayPage />);
    await secaoNoW1();

    await clickConnectedButton("Finalizar");

    // RED: hoje a página só recarrega — falta o `timer:cancel` na frente.
    await waitFor(() => {
      expect(ordem).toEqual([
        "timer:cancel",
        "fonte:inicio",
        "fonte:fim",
        "selecao",
      ]);
    });
    await drenarAssincrono();
    expect(ordem).toEqual([
      "timer:cancel",
      "fonte:inicio",
      "fonte:fim",
      "selecao",
    ]);
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).not.toHaveBeenCalled();
    // Avanço intacto 7b-1: seleção exclusivamente do recálculo do hook.
    expect(selectWorkout).not.toHaveBeenCalled();
  });

  it("desfecho cancelled: cancela o timer como primeiro efeito e mantém só a invalidação da fonte única (critérios 6 e 11)", async () => {
    const { selectWorkout } = setupToday();
    setupActive();

    render(<TodayPage />);
    await secaoNoW1();

    await clickConnectedButton("Cancelar");

    // RED: hoje a página só invalida a fonte única — sem cancelar.
    await waitFor(() => {
      expect(ordem).toEqual(["timer:cancel", "fonte:inicio", "fonte:fim"]);
    });
    await drenarAssincrono();
    expect(ordem).toEqual(["timer:cancel", "fonte:inicio", "fonte:fim"]);
    expect(ordem).not.toContain("selecao");
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).not.toHaveBeenCalled();
    expect(selectWorkout).not.toHaveBeenCalled();
    // DA2: treino preservado (mesma seção, mesma origem).
    expect(lastSectionProps()["workoutId"]).toBe("w-1");
  });

  it("onExecutionCleared cancela o timer (confirmar a limpeza da última série — critérios 6 e 8)", async () => {
    setupToday();
    setupActive();

    render(<TodayPage />);
    await secaoNoW1();

    await clickConnectedButton("Limpar execução");

    // RED: a página ainda não recebe/liga o canal onExecutionCleared.
    await waitFor(() => expect(cancelSpy).toHaveBeenCalledTimes(1));
    await drenarAssincrono();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(ordem).toContain("timer:cancel");
    expect(startSpy).not.toHaveBeenCalled();
  });

  // --- Painel por treino de origem (critério 7) ---------------------------

  it("RestTimerPanel aparece com o treino de origem selecionado, some na consulta e reaparece ao voltar com o mesmo remainingSeconds", async () => {
    setupToday();
    setupActive();
    setupRestTimer({
      inicial: {
        active: true,
        remainingSeconds: 90,
        originWorkoutId: "w-1",
        exerciseName: "Supino reto",
        finished: false,
      },
    });

    render(<TodayPage />);
    await secaoNoW1();

    // RED: a página ainda não compõe o painel.
    expect(screen.getByTestId("rest-timer-panel")).toHaveAttribute(
      "data-remaining-seconds",
      "90",
    );
    expect(screen.getByTestId("rest-timer-panel")).toHaveAttribute(
      "data-exercise-name",
      "Supino reto",
    );

    // Troca para consulta (emenda 1): o painel some, o timer segue em memória.
    trocarDeTreino("w-2");
    await waitFor(() => {
      expect(
        screen.queryByTestId("rest-timer-panel"),
      ).not.toBeInTheDocument();
    });

    // Ao voltar à origem a contagem reaparece de onde parou.
    trocarDeTreino("w-1");
    await waitFor(() => {
      expect(screen.getByTestId("rest-timer-panel")).toHaveAttribute(
        "data-remaining-seconds",
        "90",
      );
    });
  });

  it("trava: troca de treino para consulta NÃO chama cancel nem start (timer e agendamento permanecem — emenda 1)", async () => {
    setupToday();
    setupActive();
    setupRestTimer({
      inicial: {
        active: true,
        remainingSeconds: 90,
        originWorkoutId: "w-1",
        exerciseName: "Supino reto",
        finished: false,
      },
    });

    render(<TodayPage />);
    await secaoNoW1();

    trocarDeTreino("w-2");
    await waitFor(() => {
      expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
        "data-workout-id",
        "w-2",
      );
    });
    await drenarAssincrono();

    expect(cancelSpy).not.toHaveBeenCalled();
    expect(startSpy).not.toHaveBeenCalled();
    expect(ordem).toEqual([]);
    expect(lastSectionProps()["workoutId"]).toBe("w-2");
  });

  // --- Hint de permissão por gesto (Mudança 5 / DA15 / critério 10) -------

  it("RestPushEnableHint aparece com permissão default (pré-condição de push por gesto)", async () => {
    setupToday();
    setupActive();
    setupPermissao({ supported: true, permission: "default" });

    render(<TodayPage />);

    // RED: a página ainda não renderiza o hint.
    expect(screen.getByTestId("rest-push-hint")).toBeInTheDocument();
  });

  it("trava: RestPushEnableHint some com permissão granted (já ativada — degradação silenciosa)", async () => {
    setupToday();
    setupActive();
    setupPermissao({ supported: true, permission: "granted" });

    render(<TodayPage />);
    await secaoNoW1();

    expect(screen.queryByTestId("rest-push-hint")).not.toBeInTheDocument();
  });

  it("trava: RestPushEnableHint some com permissão denied (nunca insiste — marcação livre)", async () => {
    setupToday();
    setupActive();
    setupPermissao({ supported: true, permission: "denied" });

    render(<TodayPage />);
    await secaoNoW1();

    expect(screen.queryByTestId("rest-push-hint")).not.toBeInTheDocument();
  });

  it("trava: RestPushEnableHint some sem suporte à API de notificação", async () => {
    setupToday();
    setupActive();
    setupPermissao({ supported: false, permission: "default" });

    render(<TodayPage />);
    await secaoNoW1();

    expect(screen.queryByTestId("rest-push-hint")).not.toBeInTheDocument();
  });
});
