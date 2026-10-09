import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

/**
 * Paridade com a manutenção (Mílon #5 replano, TASK-001 RED).
 *
 * Fonte: plan.md §2–§3 2ª volta (campo único repetição/tempo com o mesmo
 * botão de alternância da manutenção; carga com conversão secundária;
 * unidade HERDADA do exercício exibida como texto, sem botões kg/lb e sem
 * prop onChooseUnit — decisão D22) + spec §3 (mesmas opções da manutenção,
 * troca repetição/tempo; unidade e modo pertencem ao exercício e aparecem
 * no modal como herdados, sem edição) + contratos (salvamento entrega
 * somente os campos; nunca fecha no erro).
 *
 * Expected: FAIL — o modal ainda tem os botões kg/lb ligados a onChooseUnit
 * (1ª volta). Hefesto fará GREEN na TASK-004 removendo a escolha de unidade
 * do modal sem mudar estes testes.
 */
describe("SeriesEditModal — paridade com a manutenção (replano TASK-001 — RED)", () => {
  type ModalProps = Parameters<typeof SeriesEditModal>[0];

  function renderModal(props: Partial<ModalProps> = {}) {
    const merged = { ...base(), ...props } as unknown as ModalProps;
    render(<SeriesEditModal {...merged} />);
  }

  /** Container do modal (card que contém o título "Editar série"). */
  function modal(): HTMLElement {
    return screen.getByRole("heading", { name: /editar série/i })
      .parentElement as HTMLElement;
  }

  it("expõe campo único series-edit-valor (sem os dois campos simultâneos)", () => {
    renderModal();

    expect(document.getElementById("series-edit-valor")).not.toBeNull();
    expect(document.getElementById("series-edit-reps")).toBeNull();
    expect(document.getElementById("series-edit-tempo")).toBeNull();
  });

  it("campo único deriva do modo do exercício sem botão de alternância (D27)", () => {
    renderModal({
      series: makeSeries({ reps: 10, durationSeconds: null, load: 50 }),
      exerciseMode: "tempo",
    } as unknown as Partial<ModalProps>);

    expect(
      screen.queryByRole("button", {
        name: /alternar para (tempo|repetições)/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Tempo (s)")).toBeInTheDocument();
  });

  it("carga exibe conversão secundária e a unidade como texto herdado (sem botões kg/lb)", () => {
    renderModal({ series: makeSeries({ reps: 10, load: 50 }), loadUnit: "kg" });

    expect(screen.getByText(/110\.2/)).toBeInTheDocument();
    expect(
      within(modal()).queryByRole("button", { name: /^kg$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(modal()).queryByRole("button", { name: /^lb$/i }),
    ).not.toBeInTheDocument();
  });

  it("não oferece escolha de unidade: sem botões kg/lb e sem prop onChooseUnit (unidade herdada do exercício)", () => {
    const onChooseUnit = vi.fn();
    renderModal({ onChooseUnit } as unknown as Partial<ModalProps>);

    expect(
      within(modal()).queryByRole("button", { name: /^kg$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(modal()).queryByRole("button", { name: /^lb$/i }),
    ).not.toBeInTheDocument();
    expect(onChooseUnit).not.toHaveBeenCalled();
  });

  it("exibe a unidade herdada do exercício como texto (loadUnit kg), sem edição", () => {
    renderModal({ series: makeSeries({ reps: 10, load: 50 }), loadUnit: "kg" });

    const textos = within(modal()).getAllByText(/kg/);
    expect(textos.length).toBeGreaterThan(0);
    // A unidade aparece como texto, nunca como botão de escolha.
    for (const texto of textos) {
      expect(texto.tagName).not.toBe("BUTTON");
    }
  });

  it("exibe 'libra' como texto herdado quando o exercício tem loadUnit libra", () => {
    renderModal({
      series: makeSeries({ reps: 10, load: 50 }),
      loadUnit: "libra",
    });

    const textos = within(modal()).getAllByText(/libra/);
    expect(textos.length).toBeGreaterThan(0);
    for (const texto of textos) {
      expect(texto.tagName).not.toBe("BUTTON");
    }
    expect(
      within(modal()).queryByRole("button", { name: /^kg$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(modal()).queryByRole("button", { name: /^lb$/i }),
    ).not.toBeInTheDocument();
  });

  it("salvar entrega somente os campos { reps, durationSeconds, load }", async () => {
    const onSave = vi.fn(async (_fields: SeriesEditFields) => {});
    renderModal({
      series: makeSeries({ reps: 10, durationSeconds: null, load: 50 }),
      onSave,
    });

    fireEvent.change(screen.getByLabelText(/carga/i), {
      target: { value: "55" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const campos = onSave.mock.calls[0][0];
    expect(Object.keys(campos).sort()).toEqual(
      ["durationSeconds", "load", "reps"].sort(),
    );
    expect(campos).not.toHaveProperty("copiar");
    expect(campos).not.toHaveProperty("copy");
  });

  it("modal aberto com mensagem visível no erro (validação e persistência, sem fechar)", async () => {
    const onSave = vi.fn(async () => {});
    renderModal({ onSave });

    fireEvent.change(campo(/carga/i), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/valor numérico válido para a carga/i),
      ).toBeInTheDocument(),
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /salvar/i })).toBeInTheDocument();
  });
});

/**
 * Contrato RED da TASK-006 (Mílon #5, aditamento 2026-10-09 dos 3 achados).
 *
 * Fonte: tasks.json TASK-006 (SeriesEditModal: campo único pelo modo;
 * unidade como texto sem edição; sem alternância; sem botões de unidade)
 * + plan.md Aditamento §1 Mudança B + §3 (Modal de execução: recebe modo
 * e unidade herdadas sem edição; campo único rotulado pelo modo; Carga
 * com unidade ao lado como texto; sem alternância, sem botões, sem cópia;
 * salvamento com valor único replicado mantendo marcação) + spec §3
 * (modal com único campo + Carga com unidade ao lado como texto herdado,
 * sem troca e sem botões) + D27.
 *
 * Contrato fixado aqui (nomes que a TASK-008 deve implementar):
 * - SeriesEditModalProps ganha `exerciseMode: "repeticao" | "tempo" | null`
 *   (rótulo do campo único deriva DAQUI, nunca do dado da série; nulo =
 *   fallback repetições) e mantém `loadUnit` herdada sem edição;
 * - campo único tem id series-edit-valor e rótulo "Repetições" no modo
 *   repetição ou "Tempo (s)" no modo tempo;
 * - o rótulo da Carga exibe a unidade ao lado como texto (ex.:
 *   "Carga (kg)"), sem botões e sem edição;
 * - SEM botão de alternância repetição/tempo e SEM botões kg/lb.
 *
 * Expected: FAIL — o modal atual deriva o modo do dado da série, tem o
 * botão de alternância e rotula a Carga sem a unidade ao lado. Hefesto
 * fará GREEN na TASK-008 sem mudar estes testes. Props novas via cast
 * para o tsc seguir verde no RED (falha em runtime, não em tipo).
 */
describe("SeriesEditModal — campo único pelo modo do exercício (TASK-006 — RED)", () => {
  type ModalProps = Parameters<typeof SeriesEditModal>[0];
  type WithMode = ModalProps & {
    exerciseMode?: "repeticao" | "tempo" | null;
  };

  function renderModo(props: Partial<WithMode> = {}) {
    const merged = { ...base(), ...props } as unknown as ModalProps;
    render(<SeriesEditModal {...merged} />);
  }

  /** Rótulo associado ao campo único de valor. */
  function rotuloDoValor(): string {
    const input = document.getElementById("series-edit-valor") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    const id = input?.getAttribute("id");
    const label = id
      ? document.querySelector(`label[for="${id}"]`)
      : null;
    return label?.textContent ?? "";
  }

  /** Rótulo associado ao campo de carga. */
  function rotuloDaCarga(): string {
    const input = document.getElementById("series-edit-carga") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    const id = input?.getAttribute("id");
    const label = id
      ? document.querySelector(`label[for="${id}"]`)
      : null;
    return label?.textContent ?? "";
  }

  it("modo tempo rotula o campo único como Tempo (s) mesmo com série de reps", () => {
    renderModo({
      series: makeSeries({ reps: 10, durationSeconds: null, load: 50 }),
      exerciseMode: "tempo",
      loadUnit: "kg",
    });

    expect(document.getElementById("series-edit-valor")).not.toBeNull();
    expect(rotuloDoValor()).toMatch(/tempo/i);
    expect(rotuloDoValor()).not.toMatch(/repeti/i);
  });

  it("modo repeticao rotula o campo único como Repetições mesmo com série de tempo", () => {
    renderModo({
      series: makeSeries({ reps: null, durationSeconds: 45, load: 50 }),
      exerciseMode: "repeticao",
      loadUnit: "kg",
    });

    expect(rotuloDoValor()).toMatch(/repeti/i);
  });

  it("modo nulo usa fallback repetições", () => {
    renderModo({
      series: makeSeries({ reps: null, durationSeconds: 45, load: 50 }),
      exerciseMode: null,
      loadUnit: "kg",
    });

    expect(rotuloDoValor()).toMatch(/repeti/i);
  });

  it("rótulo da Carga exibe a unidade herdada ao lado como texto (kg)", () => {
    renderModo({
      series: makeSeries({ reps: 10, load: 50 }),
      exerciseMode: "repeticao",
      loadUnit: "kg",
    });

    expect(rotuloDaCarga()).toMatch(/carga/i);
    expect(rotuloDaCarga()).toMatch(/kg/i);
  });

  it("rótulo da Carga exibe a unidade herdada ao lado como texto (libra)", () => {
    renderModo({
      series: makeSeries({ reps: 10, load: 50 }),
      exerciseMode: "repeticao",
      loadUnit: "libra",
    });

    expect(rotuloDaCarga()).toMatch(/carga/i);
    expect(rotuloDaCarga()).toMatch(/libra/i);
  });

  it("NÃO expõe alternância entre repetição e tempo (modo pertence ao exercício)", () => {
    renderModo({
      series: makeSeries({ reps: 10, load: 50 }),
      exerciseMode: "repeticao",
      loadUnit: "kg",
    });

    expect(
      screen.queryByRole("button", {
        name: /alternar para (tempo|repetições)/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("NÃO expõe botões de unidade no modal de execução", () => {
    renderModo({
      series: makeSeries({ reps: 10, load: 50 }),
      exerciseMode: "repeticao",
      loadUnit: "kg",
    });

    const dialog = screen.getByRole("heading", {
      name: /editar série/i,
    }).parentElement as HTMLElement;
    expect(
      within(dialog).queryByRole("button", { name: /^kg$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: /^lb$/i }),
    ).not.toBeInTheDocument();
  });

  it("salvar no modo tempo entrega durationSeconds com reps nulo", async () => {
    const onSave = vi.fn(async (_fields: SeriesEditFields) => {});
    renderModo({
      series: makeSeries({ reps: 10, durationSeconds: null, load: 50 }),
      exerciseMode: "tempo",
      loadUnit: "kg",
      onSave,
    });

    fireEvent.change(screen.getByLabelText(/tempo/i), {
      target: { value: "60" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const campos = onSave.mock.calls[0][0];
    expect(campos).toMatchObject({
      reps: null,
      durationSeconds: 60,
    });
  });
});
