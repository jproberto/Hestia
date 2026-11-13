import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useTransactionForm,
  type UseTransactionFormOptions,
} from "@/lib/pluto/hooks/useTransactionForm";
import {
  createTransaction,
  updateTransaction,
} from "@/lib/pluto/db/transactions";
import { getOrCreateAccount } from "@/lib/pluto/db/accounts";
import { getOrCreateCategory } from "@/lib/pluto/db/categories";
import type { IDatabaseClient } from "@/lib/shared/database";
import type { Account, TransactionWithDetails } from "@/lib/pluto/types";
import { FakeAccountRepository } from "@/lib/pluto/repositories/fakes/fakeAccountRepository";

vi.mock("@/lib/pluto/db/transactions", () => ({
  getTransactionsByMonth: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));

vi.mock("@/lib/pluto/db/accounts", () => ({
  getAccounts: vi.fn(),
  getOrCreateAccount: vi.fn(),
}));

vi.mock("@/lib/pluto/db/categories", () => ({
  getCategories: vi.fn(),
  getOrCreateCategory: vi.fn(),
}));

const EMAIL = "teste@hestia.com";
const acc: Account = { id: "a1", name: "Itaú", type: "conta", created_at: null, created_by: null };
const categories = [{ id: "c1", name: "Alimentação", type: "despesa" }] as never;

// Contrato 05e (plan §Hooks): as opções do formulário recebem o mês da tela
// (selectedYear/selectedMonth) e NÃO mais os delimitadores minDateStr/maxDateStr.
function makeFormOptions() {
  const fetchData = vi.fn(() => Promise.resolve());
  const setErrorMsg = vi.fn();
  return {
    db: {} as IDatabaseClient,
    userEmail: EMAIL,
    categories,
    selectedYear: 2026,
    selectedMonth: 3,
    fetchData,
    setErrorMsg,
  };
}

function renderForm(options: ReturnType<typeof makeFormOptions> = makeFormOptions()) {
  // Cast ponte: o contrato novo (selectedYear/selectedMonth) ainda não existe
  // nos tipos do hook atual — é exatamente o que o RED desta task fixa; o
  // cast desaparece em termos de efeito quando o hook migrar na T5.
  const hookOptions = options as unknown as UseTransactionFormOptions;
  const hook = renderHook(() => useTransactionForm(hookOptions));
  return { ...hook, options, fetchData: options.fetchData, setErrorMsg: options.setErrorMsg };
}

function fillValid(result: { current: ReturnType<typeof useTransactionForm> }) {
  act(() => {
    result.current.handleOpenTxModal(acc);
    result.current.setDescription("Supermercado");
    result.current.setAmount("200");
    result.current.setAccountInput("Itaú");
    result.current.setCategoryInput("Alimentação");
  });
}

function openEditModal(result: { current: ReturnType<typeof useTransactionForm> }) {
  act(() => {
    result.current.handleOpenEditModal({
      id: "t1", description: "Supermercado", amount: 200, type: "despesa",
      is_refund: false, date: "2026-03-15", category_id: "c1", account_id: "a1",
      period_year: 2026, period_month: 3,
      category_name: "Alimentação", account_name: "Itaú",
      created_at: "2026-03-15T00:00:00Z", created_by: EMAIL,
    });
  });
}

describe("useTransactionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrCreateAccount).mockResolvedValue("a1");
    vi.mocked(getOrCreateCategory).mockResolvedValue("c1");
    vi.mocked(createTransaction).mockResolvedValue({} as never);
    vi.mocked(updateTransaction).mockResolvedValue({} as never);
  });

  it("abre nova transação com a data no primeiro dia do mês da tela (opções sem minDateStr)", () => {
    const options = makeFormOptions();

    // Contrato 05e: as opções carregam o mês da tela e NÃO contêm minDateStr.
    expect(Object.keys(options)).not.toContain("minDateStr");
    expect(options.selectedYear).toBe(2026);
    expect(options.selectedMonth).toBe(3);

    const { result } = renderForm(options);

    act(() => {
      result.current.handleOpenTxModal(acc);
    });

    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.accountInput).toBe("Itaú");
    // Regra 2 / cenário 10: tela em 2026-03 abre com 2026-03-01.
    expect(result.current.date).toBe("2026-03-01");
    expect(result.current.editingTransaction).toBeNull();
  });

  it("abre nova transação no primeiro dia do mês da tela escolhido (selectedMonth 11)", () => {
    const options = { ...makeFormOptions(), selectedMonth: 11 };

    const { result } = renderForm(options);

    act(() => {
      result.current.handleOpenTxModal(acc);
    });

    expect(result.current.date).toBe("2026-11-01");
  });

  it("recusa salvar com campos vazios", async () => {
    const { result, setErrorMsg } = renderForm();

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(setErrorMsg).toHaveBeenCalledWith("Preencha todos os campos obrigatórios.");
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("recusa salvar com valor inválido", async () => {
    const { result, setErrorMsg } = renderForm();
    fillValid(result);

    act(() => {
      result.current.setAmount("abc");
    });

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(setErrorMsg).toHaveBeenCalledWith("O valor deve ser um número maior que zero.");
  });

  it("cria transação válida, fecha e recarrega", async () => {
    const { result, fetchData } = renderForm();
    fillValid(result);

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(createTransaction).toHaveBeenCalled();
    expect(result.current.isTxModalOpen).toBe(false);
    expect(fetchData).toHaveBeenCalled();
  });

  it("cria com period_year/period_month do mês da tela mesmo quando a data digitada é de outro mês", async () => {
    const { result } = renderForm();
    fillValid(result);

    // Regra 3 / cenário 1: fatura datada de outro mês lançada na tela de 2026-03.
    act(() => {
      result.current.setDate("2026-04-10");
    });

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(createTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        date: "2026-04-10",
        period_year: 2026,
        period_month: 3,
      }),
      EMAIL
    );
  });

  it("edita transação existente sem reenviar period_year/period_month no payload", async () => {
    const { result } = renderForm();
    openEditModal(result);

    expect(result.current.editingTransaction?.id).toBe("t1");

    await act(async () => {
      await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
    });

    expect(updateTransaction).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(updateTransaction).mock.calls[0][2];
    // Regra 8 / decisão D6: a edição não move o lançamento de mês — o payload
    // é TransactionUpdateInput, sem campos de período.
    expect(payload).not.toHaveProperty("period_year");
    expect(payload).not.toHaveProperty("period_month");
    expect(payload).toMatchObject({ amount: 200, date: "2026-03-15" });
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("salvar e adicionar outro mantém aberto, preserva a data digitada e zera os campos do 05d", async () => {
    const { result } = renderForm();
    fillValid(result);

    // Regra 10 / cenário 9: data digitada de outro mês permanece após salvar.
    act(() => {
      result.current.setDate("2026-04-10");
    });

    await act(async () => {
      await result.current.handleSaveTransactionAndAddAnother({ preventDefault: () => {} } as never);
    });

    expect(createTransaction).toHaveBeenCalled();
    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.txSuccessMsg).toBe("Transação salva com sucesso!");
    expect(result.current.date).toBe("2026-04-10");
    expect(result.current.description).toBe("");
    expect(result.current.amount).toBe("");
    expect(result.current.categoryInput).toBe("");
    expect(result.current.isRefund).toBe(false);
  });

  it("prefill do checklist resolve nome da categoria", () => {
    const { result } = renderForm();

    act(() => {
      result.current.handleTriggerTransactionModalFromChecklist({
        description: "Luz", type: "despesa", category_id: "c1", amount: 150, date: "2026-03-10",
      });
    });

    expect(result.current.isTxModalOpen).toBe(true);
    expect(result.current.categoryInput).toBe("Alimentação");
    expect(result.current.amount).toBe("150");
  });

  // R7 / D5/D6 (spec §5 e §8 cenário 5): no blur do campo de categoria, se
  // existir homônima do OUTRO tipo sob normalizeName, o campo assume a grafia
  // da linha existente — sem aviso e sem estado novo de mensagem.
  describe("handleCategoryBlur (homônima do outro tipo no blur — R7)", () => {
    type BlurCapable = { handleCategoryBlur?: () => void };

    function blurOf(result: { current: unknown }) {
      return (result.current as BlurCapable).handleCategoryBlur;
    }

    it("com 'Mercado' (receita) existente e 'mercado' digitado numa despesa, o blur define categoryInput como 'Mercado'", () => {
      const options = {
        ...makeFormOptions(),
        categories: [
          { id: "c1", name: "Alimentação", type: "despesa" },
          { id: "c2", name: "Mercado", type: "receita" },
        ] as never,
      };
      const { result, setErrorMsg } = renderForm(options);

      act(() => {
        // handleOpenTxModal fixa type = "despesa" — o lançamento é despesa.
        result.current.handleOpenTxModal(acc);
        result.current.setCategoryInput("mercado");
      });

      // O open modal legado chama setErrorMsg(null) (limpeza pré-existente,
      // fora do escopo da R7) — zera o spy para isolar o ato do blur.
      setErrorMsg.mockClear();

      const blur = blurOf(result);
      expect(typeof blur).toBe("function");
      act(() => blur!());

      expect(result.current.categoryInput).toBe("Mercado");
      // R7: sem aviso visível — o blur não escreve mensagem de erro.
      expect(setErrorMsg).not.toHaveBeenCalled();
    });

    it("com homônima do MESMO tipo o valor digitado não muda no blur", () => {
      const options = {
        ...makeFormOptions(),
        categories: [{ id: "c1", name: "Mercado", type: "despesa" }] as never,
      };
      const { result } = renderForm(options);

      act(() => {
        result.current.handleOpenTxModal(acc); // type = "despesa"
        result.current.setCategoryInput("mercado");
      });

      const blur = blurOf(result);
      expect(typeof blur).toBe("function");
      act(() => blur!());

      expect(result.current.categoryInput).toBe("mercado");
    });

    it("com entrada vazia o blur não altera nada", () => {
      const options = {
        ...makeFormOptions(),
        categories: [{ id: "c2", name: "Mercado", type: "receita" }] as never,
      };
      const { result } = renderForm(options);

      act(() => {
        result.current.handleOpenTxModal(acc);
        result.current.setCategoryInput("");
      });

      const blur = blurOf(result);
      expect(typeof blur).toBe("function");
      act(() => blur!());

      expect(result.current.categoryInput).toBe("");
    });
  });

  // F1 (Argos CRITICAL 2026-11-08 + emenda do plano aprovada pelo humano em
  // 2026-11-08): todo call site de getOrCreateAccount precisa enviar
  // accountType coerente com a conta selecionada/registrada — a identidade de
  // financial_accounts é (nome normalizado, tipo) (R2/R4 da spec). O
  // repositório é exercitado pelo FakeAccountRepository (espelho do contrato
  // nome+tipo), então um tipo errado vira comportamento observável: conta
  // fantasma criada e account_id da transação repontado silenciosamente.
  describe("F1 — fluxos de conta: accountType coerente nos call sites (emenda 2026-11-08)", () => {
    const cartaoNubank: Account = {
      id: "a1",
      name: "Nubank",
      type: "cartao",
      created_at: null,
      created_by: null,
    };
    const contaItau: Account = {
      id: "a1",
      name: "Itaú",
      type: "conta",
      created_at: null,
      created_by: null,
    };

    function delegateToFake(fake: FakeAccountRepository) {
      vi.mocked(getOrCreateAccount).mockImplementation((_db, name, email, type) =>
        fake.getOrCreateAccount(name, email, type)
      );
    }

    function makeEditTx(account: Account): TransactionWithDetails {
      return {
        id: "t1",
        description: "Fatura",
        amount: 150,
        type: "despesa",
        is_refund: false,
        date: "2026-03-15",
        category_id: "c1",
        account_id: account.id,
        period_year: 2026,
        period_month: 3,
        category_name: "Alimentação",
        account_name: account.name,
        // Cast ponte: account_type em TransactionWithDetails é a rota
        // sancionada pela emenda F1 ("edicao usa tipo do registro"; sugestão 1
        // do Argos: account_type em TransactionWithDetails) — types.ts:155-169
        // ainda não tem o campo; o GREEN desta correção o adiciona (junto com o
        // join que o alimenta, se essa rota for a implementada).
        account_type: account.type,
        created_at: "2026-03-15T00:00:00Z",
        created_by: EMAIL,
      } as unknown as TransactionWithDetails;
    }

    function formOptionsWithAccounts(accounts: Account[]) {
      // Cast ponte: rota alternativa sancionada pela sugestão 1 do Argos
      // (resolução do tipo por nome normalizado contra a lista de accounts) —
      // a opção accounts ainda não existe em UseTransactionFormOptions.
      return {
        ...makeFormOptions(),
        accounts,
      } as ReturnType<typeof makeFormOptions>;
    }

    it("F1 — edição de transação de CARTÃO sem tocar na conta mantém account_id e não cria conta fantasma", async () => {
      const fake = new FakeAccountRepository([cartaoNubank]);
      delegateToFake(fake);

      const { result } = renderForm(formOptionsWithAccounts([cartaoNubank]));

      act(() => {
        result.current.handleOpenEditModal(makeEditTx(cartaoNubank));
      });

      await act(async () => {
        await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
      });

      // Sem alterar a conta, o ponteiro da transação não muda...
      expect(updateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        "t1",
        expect.objectContaining({ account_id: "a1" })
      );
      // ...e nenhuma linha nova aparece no repositório de contas (hoje o
      // lookup procura nome+tipo 'conta', não acha o cartão e insere a
      // fantasma 'conta' com o mesmo nome).
      const after = await fake.getAccounts();
      expect(after).toHaveLength(1);
      expect(after[0].type).toBe("cartao");
    });

    it("F1 — edição de transação de CONTA sem tocar na conta mantém account_id e não cria conta fantasma (regressão)", async () => {
      const fake = new FakeAccountRepository([contaItau]);
      delegateToFake(fake);

      const { result } = renderForm(formOptionsWithAccounts([contaItau]));

      act(() => {
        result.current.handleOpenEditModal(makeEditTx(contaItau));
      });

      await act(async () => {
        await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
      });

      expect(updateTransaction).toHaveBeenCalledWith(
        expect.anything(),
        "t1",
        expect.objectContaining({ account_id: "a1" })
      );
      const after = await fake.getAccounts();
      expect(after).toHaveLength(1);
      expect(after[0].type).toBe("conta");
    });

    it("F1 — criação pré-fixada no card de cartão envia accountType 'cartao' (regressão da regra central)", async () => {
      const fake = new FakeAccountRepository([cartaoNubank]);
      delegateToFake(fake);

      const { result } = renderForm();

      act(() => {
        result.current.handleOpenTxModal(cartaoNubank);
        result.current.setDescription("Fatura");
        result.current.setAmount("99");
        result.current.setCategoryInput("Alimentação");
      });

      await act(async () => {
        await result.current.handleSaveTransaction({ preventDefault: () => {} } as never);
      });

      expect(createTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ account_id: "a1" }),
        EMAIL
      );
      const after = await fake.getAccounts();
      expect(after).toHaveLength(1);
      expect(after[0].type).toBe("cartao");
    });

    // Registro pedido na delegação F1: em disco o prefill do checklist NÃO
    // define conta (useTransactionForm.ts:106 limpa accountInput) — não há
    // par conta+tipo a cobrar ali. O tipo passa a ser cobrado onde a conta é
    // de fato definida: na escolha no select (fluxo de página) e na edição
    // (dois testes acima).
    it("F1 — prefill do checklist não define conta: accountInput volta vazio (registro)", () => {
      const { result } = renderForm();

      act(() => {
        // Estado prévio realista: usuário abriu pelo card de cartão antes.
        result.current.handleOpenTxModal(cartaoNubank);
        result.current.handleTriggerTransactionModalFromChecklist({
          description: "Fatura",
          type: "despesa",
          category_id: "c1",
          amount: 50,
          date: "2026-03-10",
        });
      });

      expect(result.current.accountInput).toBe("");
    });
  });
});
