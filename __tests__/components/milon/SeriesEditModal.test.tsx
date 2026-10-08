import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SeriesEditModal from "@/components/milon/SeriesEditModal";
import type { LoadUnit, WorkoutSeries } from "@/lib/milon/types";

/**
 * Contrato RED — Mílon #5 Execução série a série (TASK-005):
 * `components/milon/SeriesEditModal.tsx` (modal novo, presentacional).
 *
 * Fonte da verdade: `.agents/modules/milon/05-execucao-series/spec.md` §3
 * (modal edita as informações da série e salva, SEM opção de copiar; ao
 * salvar os mesmos valores valem para aquela série e todas as seguintes;
 * salvar fecha o modal e a série volta para exibição bloqueada) +
 * `plan.md` §2 (Create: SeriesEditModal + stories; modal de edição da série
 * com campos de repetições ou tempo, carga, salvar e fechar, sem qualquer
 * opção de cópia; nunca fecha no erro) + §3 (contrato textual do modal:
 * props com a série em edição, unidade de carga do exercício, estado de
 * salvamento, mensagem de erro local, callback de fechar e callback de
 * salvar recebendo SOMENTE os campos, sem qualquer indicador de cópia;
 * validação herdada de workout-utils com mensagens visíveis e modal
 * permanecendo aberto no erro; título usa o token font-display) +
 * `tasks.json` TASK-005 (acceptanceCriteria — fonte da cobertura).
 *
 * Escrito ANTES da implementação (outside-in): falha porque
 * `@/components/milon/SeriesEditModal` ainda não existe —
 * Expected: FAIL com "módulo não encontrado" (nenhum arquivo de
 * produção alterado). Hefesto fará GREEN na TASK-006.
 *
 * CONTRATO CONSUMIDO (plan.md §3 — SeriesEditModal):
 * - props: `open`, `series` (série em edição), `loadUnit` (unidade de carga
 *   do exercício), `saving`, `error` (mensagem de erro local),
 *   `onClose()`, `onSave(fields)` com fields = SOMENTE
 *   `{ reps, durationSeconds, load }` (sem indicador de cópia);
 * - abre com os valores atuais da série; sem qualquer opção de cópia
 *   (sem checkbox, sem texto copiar/aplicar/segintes como opção);
 * - validação herdada (workout-utils) com mensagem visível e modal
 *   permanecendo aberto; erro de salvamento mantém o modal aberto;
 * - fechar chama onClose; título usa o token font-display.
 */

const CRIADO_EM = "2026-10-01T00:00:00Z";
const DONO = "ana@hestia.lan";

interface SeriesEditFields {
  reps: number | null;
  durationSeconds: number | null;
  load: number | null;
}

interface SeriesEditModalProps {
  open: boolean;
  series: WorkoutSeries | null;
  loadUnit: LoadUnit | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (fields: SeriesEditFields) => Promise<void>;
}

function makeSeries(overrides: Partial<WorkoutSeries> = {}): WorkoutSeries {
  return {
    id: "ser-1",
    entryId: "ent-1",
    position: 1,
    reps: 10,
    durationSeconds: null,
    load: 50,
    createdAt: CRIADO_EM,
    created_by: DONO,
    ...overrides,
  };
}

function base(overrides: Partial<SeriesEditModalProps> = {}): SeriesEditModalProps {
  return {
    open: true,
    series: makeSeries(),
    loadUnit: "kg",
    saving: false,
    error: null,
    onClose: vi.fn(),
    onSave: vi.fn(async () => {}),
    ...overrides,
  };
}

/** Campo por rótulo com fallback para placeholder. */
function campo(rotulo: RegExp): HTMLElement {
  const porLabel = screen.queryByLabelText(rotulo);
  if (porLabel) return porLabel;
  const porPlaceholder = screen.queryByPlaceholderText(rotulo);
  if (porPlaceholder) return porPlaceholder;
  throw new Error(`Campo com rótulo ${rotulo} não encontrado`);
}

describe("SeriesEditModal (TASK-005 — RED)", () => {
  it("não renderiza nada quando fechado", () => {
    const { container } = render(
      <SeriesEditModal {...base({ open: false })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("abre com os valores atuais da série", () => {
    render(
      <SeriesEditModal
        {...base({ series: makeSeries({ reps: 12, load: 42.5 }) })}
      />,
    );

    expect(campo(/repetições/i)).toHaveValue("12");
    expect(campo(/carga/i)).toHaveValue("42.5");
  });

  it("não oferece qualquer opção de cópia (sem checkbox, sem texto de copiar/aplicar)", () => {
    render(<SeriesEditModal {...base()} />);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/copiar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cópia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/somente esta/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /aplicar a todas/i }),
    ).not.toBeInTheDocument();
  });

  it("salvar chama onSave somente com os campos (sem indicador de cópia)", async () => {
    const onSave = vi.fn(async (_fields: SeriesEditFields) => {});
    render(
      <SeriesEditModal
        {...base({ series: makeSeries({ reps: 10, load: 50 }), onSave })}
      />,
    );

    const reps = campo(/repetições/i);
    fireEvent.change(reps, { target: { value: "12" } });
    fireEvent.blur(reps);
    const carga = campo(/carga/i);
    fireEvent.change(carga, { target: { value: "55" } });
    fireEvent.blur(carga);

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const campos = onSave.mock.calls[0][0];
    expect(Object.keys(campos).sort()).toEqual(
      ["durationSeconds", "load", "reps"].sort(),
    );
    expect(campos).toMatchObject({ reps: 12, load: 55 });
    expect(campos).not.toHaveProperty("copiar");
    expect(campos).not.toHaveProperty("copy");
    expect(campos).not.toHaveProperty("applyToFollowing");
  });

  it("validação herdada mostra mensagem visível e mantém o modal aberto", async () => {
    const onSave = vi.fn(async () => {});
    render(<SeriesEditModal {...base({ onSave })} />);

    const reps = campo(/repetições/i);
    fireEvent.change(reps, { target: { value: "abc" } });
    fireEvent.blur(reps);
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/número inteiro maior ou igual a zero/i),
      ).toBeInTheDocument(),
    );
    expect(onSave).not.toHaveBeenCalled();
    // Modal permanece aberto: campos e botões seguem visíveis.
    expect(campo(/repetições/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeInTheDocument();
  });

  it("erro de salvamento mantém o modal aberto com a mensagem visível", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("Falha ao salvar série");
    });
    const { rerender } = render(
      <SeriesEditModal {...base({ onSave })} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    // O chamador registra o erro via prop `error`; o modal exibe e não fecha.
    rerender(
      <SeriesEditModal
        {...base({ onSave, error: "Falha ao salvar série" })}
      />,
    );

    expect(screen.getByText("Falha ao salvar série")).toBeInTheDocument();
    expect(campo(/repetições/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeInTheDocument();
  });

  it("fechar chama onClose", () => {
    const onClose = vi.fn();
    render(<SeriesEditModal {...base({ onClose })} />);

    const fechar =
      screen.queryByRole("button", { name: /fechar/i }) ??
      screen.getByRole("button", { name: /cancelar/i });
    fireEvent.click(fechar);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("título usa o token font-display", () => {
    render(<SeriesEditModal {...base()} />);

    const titulo = screen.getByRole("heading", { name: /série/i });
    expect(titulo.className).toMatch(/font-display/);
  });

  it("saving desabilita o salvar (sem duplo clique)", () => {
    render(<SeriesEditModal {...base({ saving: true })} />);

    expect(
      screen.getByRole("button", { name: /salvar/i }),
    ).toBeDisabled();
  });
});
