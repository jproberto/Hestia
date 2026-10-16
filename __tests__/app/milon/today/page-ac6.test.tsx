import {
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
 * Contrato RED — Mílon 07c AC6 (achado Important do Argos, review-report.json).
 *
 * Fonte: `.agents/modules/milon/07c-troca-execucao-ativa/spec.md` AC6
 * ("Após `Finalizar` ou `Cancelar` no treino ativo, outro treino passa a
 * aceitar escrita imediatamente (sem reload)") + jornada passos 5-6 +
 * `plan.md` §4 (fluxo de liberação) + blocker do Argos:
 * `app/milon/today/page.tsx:22-25` consome só `activeWorkoutId` de
 * `useActiveExecution` (busca 1x no mount, deps `[db]` em
 * `useActiveExecution.ts:66-87`); após Finalizar/Cancelar no Treino A a
 * fonte segue stale e o Treino B não libera escrita sem reload.
 *
 * O que se trava aqui (decisão da PÁGINA, não interior das peças):
 * montar a página com execução aberta em A, finalizar/cancelar, trocar
 * para B e exigir escrita liberada SEM reload.
 *
 * Isolamento: `useTodayWorkout` + `useActiveExecution` + seção/switcher
 * mockados por arquivo. O mock de `useActiveExecution` reproduz a
 * staleness real (snapshot no mount + `retry` que relê o "backend");
 * o mock da seção simula o selamento/cancelamento (zera o "backend")
 * e, SE a página tiver wired alguma invalidação (ex.: `onExecutionSettled`
 * chamando `retry`, cf. sugestão do Argos), a invoca — hoje a página
 * passa só `activeWorkoutId` (page.tsx:22-25) sem `retry`, logo nada
 * invalida e o teste FALHA pelo motivo certo (stale). Após a correção,
 * o `retry` recarrega nulo e B libera.
 *
 * Expected: FAIL hoje (writeBlocked segue true em B — stale
 * activeWorkoutId=A); PASS após correção. NÃO toca produção.
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

/**
 * "Backend" simulado da execução aberta: o DB real após Finalizar
 * (UPDATE finished_at) / Cancelar (exclusão física) deixa de ter aberta.
 * Aqui: `"w-1"` = aberta em A; `null` = nenhuma aberta (pós-settle).
 * Resetado para `"w-1"` em cada teste. O mock do hook captura o valor
 * UMA vez no mount (stale real) e só relê via `retry`.
 */
let backendActiveWorkoutId: string | null = "w-1";

vi.mock("@/components/milon/WorkoutDetailSection", () => ({
  WorkoutDetailSection: vi.fn((props: Record<string, unknown>) => {
    const workoutId = props["workoutId"] as string | undefined;
    const writeBlocked = props["writeBlocked"] as boolean | undefined;
    const blockedTooltip = props["blockedTooltip"] as string | null | undefined;
    const blocked = writeBlocked === true;

    async function settleAndNotify(): Promise<void> {
      // Selamento/cancelamento: o DB deixa de ter aberta (mesmo efeito do
      // finishExecution/cancelExecution reais sobre a fonte por dono).
      backendActiveWorkoutId = null;
      // Se a página (corrigida) expôs invalidação, ela chama `retry` aqui.
      // Varre nomes plausíveis para não acoplar ao nome exato que Hefesto
      // escolher (sugestão do Argos: `onExecutionSettled` → `retry()`).
      const candidates = Object.entries(props).filter(
        ([key, value]) =>
          typeof value === "function" &&
          /(settled|settlement|invalidat|refresh|reload|executionchange|activechange|onexecution|onsettled|onfinish|oncancel|onactive|onrefresh|oninvalidate)/i.test(
            key,
          ),
      );
      for (const [, fn] of candidates) {
        await (fn as () => unknown)();
      }
    }

    function handleSettle(): void {
      void settleAndNotify();
    }

    return (
      <div
        data-testid="secao-detalhe"
        data-workout-id={workoutId ?? ""}
        data-write-blocked={blocked ? "true" : "false"}
      >
        {blocked && blockedTooltip ? <div role="alert">{blockedTooltip}</div> : null}
        <button
          type="button"
          disabled={blocked}
          aria-label="Marcar série"
          title={blocked && blockedTooltip ? blockedTooltip : undefined}
          onClick={() => {}}
        >
          Marcar série
        </button>
        <button type="button" onClick={handleSettle}>
          Finalizar
        </button>
        <button type="button" onClick={handleSettle}>
          Cancelar
        </button>
      </div>
    );
  }),
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

/** Seleção com `useState` real: trocar no switcher re-renderiza a página. */
function setupToday(state: {
  selectedInitial: string | null;
  selectSpy: Mock;
}): void {
  const workouts = treinosAeB();
  mockedUseTodayWorkout.mockImplementation(function useTodayWorkoutMock() {
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
      state.selectedInitial,
    );
    return {
      program: makeProgram({ status: "ativo" }),
      workouts,
      selectedWorkoutId,
      selectWorkout: (workoutId: string) => {
        state.selectSpy(workoutId);
        if (workouts.some((w) => w.id === workoutId)) {
          setSelectedWorkoutId(workoutId);
        }
      },
      loading: false,
      errorMsg: null,
      errorOrigin: null,
      successNotice: null,
      retry: vi.fn(async () => {}),
    };
  });
}

/**
 * Fonte única com staleness real: snapshot no mount + `retry` que relê o
 * "backend". Espelha `useActiveExecution.ts:66-87` (busca 1x no mount,
 * deps `[db]`, nunca refaz sem `retry` — e a página hoje nem desestrutura
 * `retry`, cf. page.tsx:22-25).
 */
function setupActiveStale(retrySpy: Mock): void {
  mockedUseActiveExecution.mockImplementation(function useActiveExecutionMock() {
    const [snapshot] = useState<string | null>(backendActiveWorkoutId);
    void snapshot;
    const [current, setCurrent] = useState<string | null>(
      backendActiveWorkoutId,
    );
    return {
      activeExecution:
        current === null
          ? null
          : {
              id: "exec-1",
              workoutId: current,
              programId: "prog-1",
              startedAt: "2026-10-14T10:00:00.000Z",
              finishedAt: null,
              createdAt: "2026-10-14T10:00:00.000Z",
              created_by: DONO,
            },
      activeWorkoutId: current,
      loading: false,
      errorMsg: null,
      errorOrigin: null,
      retry: async () => {
        retrySpy();
        setCurrent(backendActiveWorkoutId);
      },
    };
  });
}

function lastSectionProps(): Record<string, unknown> {
  const mock = MockedSection as unknown as ReturnType<typeof vi.fn>;
  const last = mock.mock.calls.at(-1) as
    | [Record<string, unknown>]
    | undefined;
  return last?.[0] ?? {};
}

async function finalizarOuCancelar(nome: "Finalizar" | "Cancelar"): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: nome }).isConnected).toBe(true);
  });
  fireEvent.click(screen.getByRole("button", { name: nome }));
}

async function trocarParaB(): Promise<void> {
  fireEvent.change(screen.getByRole("combobox", { name: /treino/i }), {
    target: { value: "w-2" },
  });
  await waitFor(() => {
    expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
      "data-workout-id",
      "w-2",
    );
  });
}

describe("Treino do Dia — AC6 libera B após settle em A sem reload (07c — RED)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/milon/today");
    backendActiveWorkoutId = "w-1";
  });

  it("Finalizar em A → trocar para B libera escrita SEM reload", async () => {
    const selectSpy = vi.fn();
    const retrySpy = vi.fn();
    setupToday({ selectedInitial: "w-1", selectSpy });
    setupActiveStale(retrySpy);

    render(<TodayPage />);

    // Sanidade: em A com aberta própria, escrita liberada.
    await waitFor(() => {
      expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
        "data-workout-id",
        "w-1",
      );
    });
    expect(lastSectionProps()["writeBlocked"]).toBe(false);

    // Finaliza em A (DB zera a aberta; página stale segue com A até retry).
    await finalizarOuCancelar("Finalizar");

    // Troca para B SEM reload da página.
    await trocarParaB();

    // AC6: B aceita escrita imediatamente — seção sem bloqueio.
    // HOJE falha aqui: activeWorkoutId segue "w-1" (stale, retry nunca
    // wired na página) → writeBlocked true em B.
    await waitFor(() => {
      expect(lastSectionProps()["writeBlocked"]).toBe(false);
    });
    expect(lastSectionProps()["blockedTooltip"] ?? null).toBeNull();
    expect(
      screen.getByRole("button", { name: "Marcar série" }),
    ).toBeEnabled();
  });

  it("Cancelar em A → trocar para B libera escrita SEM reload", async () => {
    const selectSpy = vi.fn();
    const retrySpy = vi.fn();
    setupToday({ selectedInitial: "w-1", selectSpy });
    setupActiveStale(retrySpy);

    render(<TodayPage />);

    await waitFor(() => {
      expect(screen.getByTestId("secao-detalhe")).toHaveAttribute(
        "data-workout-id",
        "w-1",
      );
    });
    expect(lastSectionProps()["writeBlocked"]).toBe(false);

    await finalizarOuCancelar("Cancelar");
    await trocarParaB();

    await waitFor(() => {
      expect(lastSectionProps()["writeBlocked"]).toBe(false);
    });
    expect(lastSectionProps()["blockedTooltip"] ?? null).toBeNull();
    expect(
      screen.getByRole("button", { name: "Marcar série" }),
    ).toBeEnabled();
  });
});
