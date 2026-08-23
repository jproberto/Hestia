# Orçamento Anual por Categoria (Feature 1) Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

Use checkbox (`- [ ]`) para acompanhamento. Marque com o emoji ✅ quando a tarefa estiver concluída.

**Objetivo:** Implementar o cadastro e visualização do orçamento anual com criação inline de categorias em `/pluto/budget`, conectando ao banco de dados Supabase com auditoria completa de email e integridade física de exclusão, suportado por uma suite de testes automatizados com Vitest sob metodologia TDD.

**Arquitetura:** 
*   **Banco de Dados**: Três tabelas normalizadas (`categories`, `budget_revisions`, `budget_items`) no Supabase, com restrições `ON DELETE RESTRICT` e auditoria de e-mail em campo `TEXT`.
*   **Backend/Services**: Funções de consulta e persistência no Next.js (`lib/pluto/db/budget.ts`) usando o cliente do Supabase. A consulta resolve a vigência acumulada do orçamento usando SQL `DISTINCT ON` ordenado por `start_month DESC`.
*   **Interface**: Layout premium usando Tailwind CSS em `/pluto/budget` com dropdown de ano, suporte a estado vazio para orçamento não iniciado, resumo financeiro (Receitas, Despesas, Saldo Planejado) e formulário inline para inserção de previsões.

## Restrições Globais
*   Toda tabela deve preencher as colunas `created_at` e `created_by` (com o e-mail do usuário autenticado no formato `TEXT`).
*   Todas as chaves estrangeiras (`category_id` e `revision_id`) devem aplicar `ON DELETE RESTRICT` (bloquear exclusão do pai se houver filhos).
*   Ambiente de testes Vitest configurado e executado localmente.
*   Todo commit deve ser feito via CLI do SDD: `node .agents/scripts/sdd.js commit "<mensagem>"`.
*   Ao final da feature, a versão em `package.json` deve ser atualizada para `0.2.0` (minor bump).

---

### Tarefa 1: Configurar a Infraestrutura de Testes (Vitest + JSDOM)

**Arquivos:**
*   Modificar: `package.json`
*   Criar: `vitest.config.ts`
*   Criar: `__tests__/setup.ts`
*   Criar: `__tests__/sanity.test.ts`

**Interfaces:**
*   Produz: Script npm `npm run test` configurado para rodar a suite de testes Vitest de forma assíncrona ou em watch mode.

- [ ] **Passo 1: Adicionar dependências de teste em `package.json`**
    *   Editar `package.json` para incluir devDependencies de teste e o script `test`.
    *   Código a incluir em `package.json`:
    ```json
    "scripts": {
      "test": "vitest run"
    },
    "devDependencies": {
      "vitest": "^2.0.0",
      "@vitejs/plugin-react": "^4.3.0",
      "jsdom": "^24.1.0",
      "@testing-library/react": "^16.0.0",
      "@testing-library/jest-dom": "^6.4.0",
      "@testing-library/user-event": "^14.5.0"
    }
    ```

- [ ] **Passo 2: Executar instalação das dependências**
    *   Solicitar ao parceiro humano que execute a instalação das dependências no terminal caso ocorra falta de permissões, ou execute:
    *   Run: `npm install`
    *   Expected: Instalação das dependências com exit code 0.

- [ ] **Passo 3: Criar arquivo de configuração `vitest.config.ts`**
    *   Criar `vitest.config.ts` na raiz do projeto para configurar o Vitest com React e JSDOM:
    ```typescript
    import { defineConfig } from "vitest/config";
    import react from "@vitejs/plugin-react";
    import path from "path";

    export default defineConfig({
      plugins: [react()],
      test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "./__tests__/setup.ts",
      },
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./"),
        },
      },
    });
    ```

- [ ] **Passo 4: Criar arquivo de setup `__tests__/setup.ts`**
    *   Criar o arquivo de setup para estender as asserções do Jest-DOM:
    ```typescript
    import "@testing-library/jest-dom";
    ```

- [ ] **Passo 5: Criar teste de sanidade `__tests__/sanity.test.ts`**
    *   Criar um teste básico para certificar que o executor de testes e o DOM virtual funcionam:
    ```typescript
    import { describe, it, expect } from "vitest";

    describe("Sanity Check", () => {
      it("deve executar testes matemáticos básicos", () => {
        expect(1 + 1).toBe(2);
      });

      it("deve renderizar um elemento virtual no DOM", () => {
        const div = document.createElement("div");
        div.textContent = "Hestia";
        document.body.appendChild(div);
        expect(div).toHaveTextContent("Hestia");
        document.body.removeChild(div);
      });
    });
    ```

- [ ] **Passo 6: Executar a suite de testes**
    *   Run: `npm run test`
    *   Expected: 2 testes passando com sucesso.

- [ ] **Passo 7: Commit do ambiente de testes**
    *   Run: `git add package.json vitest.config.ts __tests__/`
    *   Run: `node .agents/scripts/sdd.js commit "chore: configura ambiente de testes com Vitest e JSDOM"`

---

### Tarefa 2: Criar as Tabelas e Políticas no Banco de Dados (Supabase SQL)

**Arquivos:**
*   Criar: `utils/supabase/migration-feature-1.sql` (contendo o script SQL para auditoria/documentação local)

**Interfaces:**
*   Produz: Tabelas `categories`, `budget_revisions` e `budget_items` criadas no banco de dados Supabase com RLS ativo.

- [ ] **Passo 1: Criar o arquivo de migração local `utils/supabase/migration-feature-1.sql`**
    *   Criar o arquivo contendo o script exato a ser executado no console SQL do Supabase:
    ```sql
    -- 1. Tabela de Categorias
    CREATE TABLE IF NOT EXISTS public.categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        created_by TEXT NOT NULL
    );

    -- 2. Tabela de Revisões Orçamentárias
    CREATE TABLE IF NOT EXISTS public.budget_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        year INTEGER NOT NULL CHECK (year >= 2026),
        start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        created_by TEXT NOT NULL,
        CONSTRAINT unique_year_start_month UNIQUE (year, start_month)
    );

    -- 3. Tabela de Itens de Orçamento (ON DELETE RESTRICT)
    CREATE TABLE IF NOT EXISTS public.budget_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        revision_id UUID NOT NULL REFERENCES public.budget_revisions(id) ON DELETE RESTRICT,
        category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
        amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        created_by TEXT NOT NULL,
        CONSTRAINT unique_revision_category UNIQUE (revision_id, category_id)
    );

    -- 4. Habilitar RLS em todas
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.budget_revisions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

    -- 5. Criar Políticas para permitir operações apenas a usuários autenticados
    CREATE POLICY "Permitir tudo para autenticados" ON public.categories 
        FOR ALL TO authenticated USING (true) WITH CHECK (true);

    CREATE POLICY "Permitir tudo para autenticados" ON public.budget_revisions 
        FOR ALL TO authenticated USING (true) WITH CHECK (true);

    CREATE POLICY "Permitir tudo para autenticados" ON public.budget_items 
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    ```

- [ ] **Passo 2: Executar o script SQL no painel do Supabase**
    *   Copiar o conteúdo do arquivo SQL anterior, acessar o console do Supabase do projeto, colar no **SQL Editor** e clicar em **Run**.
    *   Expected: Sucesso na execução dos scripts sem erros de sintaxe.

- [ ] **Passo 3: Commit da migração local**
    *   Run: `git add utils/supabase/migration-feature-1.sql`
    *   Run: `node .agents/scripts/sdd.js commit "db: adiciona tabelas e politicas de RLS para o orcamento anual"`

---

### Tarefa 3: Desenvolver a Lógica de Negócio e Serviços de Categoria e Orçamento (TDD)

**Arquivos:**
*   Criar: `lib/pluto/db/categories.ts`
*   Criar: `lib/pluto/db/budget.ts`
*   Criar: `__tests__/lib/pluto/db/categories.test.ts`
*   Criar: `__tests__/lib/pluto/db/budget.test.ts`

**Interfaces:**
*   Exporta em `lib/pluto/db/categories.ts`:
    *   `getCategories(supabaseClient: SupabaseClient, type?: 'receita' | 'despesa'): Promise<Category[]>` - Retorna as categorias cadastradas.
    *   `getOrCreateCategory(supabaseClient: SupabaseClient, name: string, type: 'receita' | 'despesa', email: string): Promise<string>` - Busca categoria existente por nome (case-insensitive se aplicável) ou cria uma nova inline, retornando seu ID.
*   Exporta em `lib/pluto/db/budget.ts`:
    *   `initBudget(supabaseClient: SupabaseClient, year: number, email: string): Promise<string>` - Cria a revisão orçamentária inicial (`start_month = 1`) para o ano e retorna o ID da revisão.
    *   `getBudgetRevision(supabaseClient: SupabaseClient, year: number): Promise<BudgetRevision | null>` - Retorna a revisão inicial ativa daquele ano.
    *   `getBudgets(supabaseClient: SupabaseClient, year: number, month: number): Promise<BudgetItem[]>` - Retorna a lista de itens orçados vigentes para o mês e ano especificados.
    *   `addOrUpdateBudgetItem(supabaseClient: SupabaseClient, revisionId: string, categoryName: string, categoryType: 'receita' | 'despesa', amount: number, email: string): Promise<void>` - Adiciona/atualiza o valor previsto para a categoria na revisão informada, consumindo `getOrCreateCategory` internamente de forma desacoplada.

- [ ] **Passo 1: Escrever os testes unitários de categorias em `__tests__/lib/pluto/db/categories.test.ts` (TDD - Red)**
    *   Testar a listagem e o get-or-create de categorias:
    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import { getOrCreateCategory, getCategories } from "@/lib/pluto/db/categories";

    const mockSupabase = {
      from: vi.fn(),
    } as any;

    describe("Serviço de Categorias", () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it("deve retornar o ID se a categoria ja existir no banco", async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "cat-123" }, error: null })
            })
          })
        });

        const id = await getOrCreateCategory(mockSupabase, "Alimentação", "despesa", "teste@hestia.com");
        expect(id).toBe("cat-123");
      });
    });
    ```

- [ ] **Passo 2: Escrever os testes unitários de orçamento em `__tests__/lib/pluto/db/budget.test.ts` (TDD - Red)**
    *   Validar cálculo de vigência acumulada por `start_month`:
    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";
    import { getBudgets } from "@/lib/pluto/db/budget";

    const mockSupabase = {
      from: vi.fn(),
    } as any;

    describe("Serviço de Orçamento", () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it("deve carregar o orçamento ativo da categoria respeitando a vigência acumulada", async () => {
        const mockData = [
          { category_id: "cat-1", amount: 1000.0, categories: { name: "Alimentação", type: "despesa" }, budget_revisions: { start_month: 4 } },
          { category_id: "cat-2", amount: 500.0, categories: { name: "Lazer", type: "despesa" }, budget_revisions: { start_month: 1 } }
        ];

        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: mockData, error: null })
                })
              })
            })
          })
        });

        const budgets = await getBudgets(mockSupabase, 2026, 8);
        expect(budgets).toHaveLength(2);
        expect(budgets[0].amount).toBe(1000.0);
        expect(budgets[0].category_name).toBe("Alimentação");
      });
    });
    ```

- [ ] **Passo 3: Executar testes para garantir que falham**
    *   Run: `npm run test`
    *   Expected: Falha de importação/compilação nos testes criados.

- [ ] **Passo 4: Implementar o serviço de categorias `lib/pluto/db/categories.ts`**
    *   Criar o arquivo de forma desacoplada:
    ```typescript
    import { SupabaseClient } from "@supabase/supabase-js";

    export interface Category {
      id: string;
      name: string;
      type: "receita" | "despesa";
      created_at: string;
      created_by: string;
    }

    export async function getCategories(supabase: SupabaseClient, type?: "receita" | "despesa"): Promise<Category[]> {
      let query = supabase.from("categories").select("*");
      if (type) {
        query = query.eq("type", type);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data || [];
    }

    export async function getOrCreateCategory(
      supabase: SupabaseClient,
      name: string,
      type: "receita" | "despesa",
      email: string
    ): Promise<string> {
      const normalizedName = name.trim();
      const { data, error } = await supabase
        .from("categories")
        .select("id")
        .eq("name", normalizedName)
        .maybeSingle();

      if (error) throw error;
      if (data) return data.id;

      const { data: newCat, error: insertError } = await supabase
        .from("categories")
        .insert({
          name: normalizedName,
          type,
          created_by: email
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      return newCat.id;
    }
    ```

- [ ] **Passo 5: Implementar o serviço de orçamentos `lib/pluto/db/budget.ts`**
    *   Criar o arquivo consumindo `getOrCreateCategory` do serviço de categorias:
    ```typescript
    import { SupabaseClient } from "@supabase/supabase-js";
    import { getOrCreateCategory } from "./categories";

    export interface BudgetRevision {
      id: string;
      year: number;
      start_month: number;
      description: string;
      created_by: string;
    }

    export interface BudgetItem {
      category_id: string;
      category_name: string;
      category_type: "receita" | "despesa";
      amount: number;
      start_month: number;
    }

    export async function getBudgetRevision(supabase: SupabaseClient, year: number): Promise<BudgetRevision | null> {
      const { data, error } = await supabase
        .from("budget_revisions")
        .select("*")
        .eq("year", year)
        .eq("start_month", 1)
        .maybeSingle();

      if (error) throw error;
      return data;
    }

    export async function initBudget(supabase: SupabaseClient, year: number, email: string): Promise<string> {
      const { data, error } = await supabase
        .from("budget_revisions")
        .insert({
          year,
          start_month: 1,
          description: `Orçamento Inicial ${year}`,
          created_by: email
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    }

    export async function getBudgets(supabase: SupabaseClient, year: number, month: number): Promise<BudgetItem[]> {
      const { data, error } = await supabase
        .from("budget_items")
        .select(`
          amount,
          category_id,
          categories (name, type),
          budget_revisions (start_month)
        `)
        .eq("budget_revisions.year", year)
        .lte("budget_revisions.start_month", month)
        .order("category_id")
        .order("budget_revisions.start_month", { ascending: false });

      if (error) throw error;

      const uniqueItems: Record<string, BudgetItem> = {};
      (data as any[] || []).forEach((row) => {
        const cat = row.categories;
        const rev = row.budget_revisions;
        if (!cat || !rev) return;

        if (!uniqueItems[row.category_id]) {
          uniqueItems[row.category_id] = {
            category_id: row.category_id,
            category_name: cat.name,
            category_type: cat.type,
            amount: parseFloat(row.amount),
            start_month: rev.start_month
          };
        }
      });

      return Object.values(uniqueItems);
    }

    export async function addOrUpdateBudgetItem(
      supabase: SupabaseClient,
      revisionId: string,
      categoryName: string,
      categoryType: "receita" | "despesa",
      amount: number,
      email: string
    ): Promise<void> {
      const categoryId = await getOrCreateCategory(supabase, categoryName, categoryType, email);

      const { error: upsertError } = await supabase
        .from("budget_items")
        .upsert({
          revision_id: revisionId,
          category_id: categoryId,
          amount,
          created_by: email
        }, { onConflict: "revision_id,category_id" });

      if (upsertError) throw upsertError;
    }
    ```

- [ ] **Passo 6: Rodar testes para garantir sucesso (Green)**
    *   Run: `npm run test`
    *   Expected: Todos os testes de categoria e orçamento passando.

- [ ] **Passo 7: Commit dos serviços desacoplados**
    *   Run: `git add lib/pluto/db/ budget/ __tests__/`
    *   Run: `node .agents/scripts/sdd.js commit "feat: implementa servicos desacoplados de categoria e orcamento com TDD"`

---

### Tarefa 4: Criar a Página de Orçamento `/pluto/budget`

**Arquivos:**
*   Criar: `app/pluto/budget/page.tsx`
*   Criar: `__tests__/app/pluto/budget-page.test.tsx`

**Interfaces:**
*   Consome: `getBudgetRevision()`, `initBudget()`, `getBudgets()`, `addOrUpdateBudgetItem()` em `lib/pluto/db/budget.ts`.
*   Consome: `getCategories()` em `lib/pluto/db/categories.ts`.
*   Produz: Interface do usuário reativa e premium em `/pluto/budget` com suporte a sugestão de categorias.

- [ ] **Passo 1: Criar testes do componente de página (TDD - Red)**
    *   Criar o arquivo `__tests__/app/pluto/budget-page.test.tsx` para validar a exibição dos estados vazio e de preenchimento do orçamento:
    ```typescript
    import { render, screen } from "@testing-library/react";
    import BudgetPage from "@/app/pluto/budget/page";
    import { describe, it, expect, vi } from "vitest";

    vi.mock("@/utils/supabase/client", () => ({
      createClient: () => ({
        auth: {
          getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } })
        }
      })
    }));

    vi.mock("@/lib/pluto/db/budget", () => ({
      getBudgetRevision: vi.fn().mockResolvedValue(null),
      initBudget: vi.fn(),
      getBudgets: vi.fn().mockResolvedValue([]),
      addOrUpdateBudgetItem: vi.fn()
    }));

    vi.mock("@/lib/pluto/db/categories", () => ({
      getCategories: vi.fn().mockResolvedValue([])
    }));

    describe("Pagina de Orcamento Anual /pluto/budget", () => {
      it("deve exibir estado vazio e botao de iniciar orcamento se nenhuma revisao existir", async () => {
        render(<BudgetPage />);
        expect(await screen.findByText(/Nenhum orçamento cadastrado para o ano/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Iniciar Orçamento/i })).toBeInTheDocument();
      });
    });
    ```

- [ ] **Passo 2: Rodar testes para garantir que falham**
    *   Run: `npm run test`
    *   Expected: Falha de importação na página.

- [ ] **Passo 3: Criar a página `app/pluto/budget/page.tsx`**
    *   Implementar a interface com dropdown, resumos e sugestão de categorias existentes no banco.
    *   Código completo a escrever em `app/pluto/budget/page.tsx`:
    ```typescript
    "use client";

    import { useEffect, useState } from "react";
    import { createClient } from "@/utils/supabase/client";
    import {
      getBudgetRevision,
      initBudget,
      getBudgets,
      addOrUpdateBudgetItem,
      BudgetRevision,
      BudgetItem
    } from "@/lib/pluto/db/budget";
    import { getCategories, Category } from "@/lib/pluto/db/categories";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";

    export default function BudgetPage() {
      const [year, setYear] = useState<number>(new Date().getFullYear());
      const [revision, setRevision] = useState<BudgetRevision | null>(null);
      const [budgets, setBudgets] = useState<BudgetItem[]>([]);
      const [categories, setCategories] = useState<Category[]>([]);
      const [loading, setLoading] = useState<boolean>(true);
      const [userEmail, setUserEmail] = useState<string>("");

      // Form state
      const [showForm, setShowForm] = useState<boolean>(false);
      const [categoryName, setCategoryName] = useState<string>("");
      const [categoryType, setCategoryType] = useState<"receita" | "despesa">("despesa");
      const [amount, setAmount] = useState<string>("");

      const supabase = createClient();

      async function loadData() {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) setUserEmail(user.email);

          const activeRevision = await getBudgetRevision(supabase, year);
          setRevision(activeRevision);

          if (activeRevision) {
            const [items, cats] = await Promise.all([
              getBudgets(supabase, year, 1),
              getCategories(supabase)
            ]);
            setBudgets(items);
            setCategories(cats);
          } else {
            setBudgets([]);
            setCategories([]);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }

      useEffect(() => { loadData(); }, [year]);

      async function handleStartBudget() {
        if (!userEmail) return;
        setLoading(true);
        try {
          await initBudget(supabase, year, userEmail);
          await loadData();
        } finally { setLoading(false); }
      }

      async function handleSaveItem(e: React.FormEvent) {
        e.preventDefault();
        if (!revision || !categoryName || !amount || !userEmail) return;
        try {
          await addOrUpdateBudgetItem(supabase, revision.id, categoryName, categoryType, parseFloat(amount), userEmail);
          setCategoryName(""); setAmount(""); setShowForm(false);
          await loadData();
        } catch (err) { console.error(err); }
      }

      if (loading) return <div className="p-6">Carregando...</div>;

      const revenues = budgets.filter((b) => b.category_type === "receita");
      const expenses = budgets.filter((b) => b.category_type === "despesa");
      const totalRevenues = revenues.reduce((acc, cur) => acc + cur.amount, 0);
      const totalExpenses = expenses.reduce((acc, cur) => acc + cur.amount, 0);
      const netBudget = totalRevenues - totalExpenses;

      const suggestions = categories.filter(
        (c) =>
          c.type === categoryType &&
          c.name.toLowerCase().includes(categoryName.toLowerCase()) &&
          c.name.toLowerCase() !== categoryName.toLowerCase()
      );

      return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold">Orçamento Anual</h1>
            </div>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="rounded border p-1">
              <option value={2026}>2026</option><option value={2027}>2027</option>
            </select>
          </div>

          {!revision ? (
            <Button onClick={handleStartBudget}>Iniciar Orçamento de {year}</Button>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4">Receitas: R$ {totalRevenues.toFixed(2)}</div>
                <div className="rounded-lg border p-4">Despesas: R$ {totalExpenses.toFixed(2)}</div>
                <div className="rounded-lg border p-4">Saldo: R$ {netBudget.toFixed(2)}</div>
              </div>

              <Button onClick={() => setShowForm(!showForm)}>Adicionar Previsão</Button>

              {showForm && (
                <form onSubmit={handleSaveItem} className="flex flex-col gap-4 rounded-lg border p-4 bg-card relative">
                  <div className="grid grid-cols-3 gap-4">
                    <select value={categoryType} onChange={(e: any) => { setCategoryType(e.target.value); setCategoryName(""); }} className="rounded border p-2">
                      <option value="despesa">Despesa</option>
                      <option value="receita">Receita</option>
                    </select>
                    <div className="relative">
                      <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Categoria" required />
                      {categoryName && suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded border bg-popover">
                          {suggestions.map((s) => (
                            <button key={s.id} type="button" onClick={() => setCategoryName(s.name)} className="w-full px-3 py-2 text-left text-sm hover:bg-muted">{s.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                  </div>
                  <Button type="submit">Salvar</Button>
                </form>
              )}
            </div>
          )}
        </div>
      );
    }
    ```

- [ ] **Passo 4: Executar testes de UI**
    *   Run: `npm run test`
    *   Expected: Todos os testes passando com sucesso.

- [ ] **Passo 5: Commit da UI de orçamento**
    *   Run: `git add app/pluto/budget/page.tsx __tests__/app/pluto/budget-page.test.tsx`
    *   Run: `node .agents/scripts/sdd.js commit "feat: cria pagina e interface de orcamento anual"`

---

### Tarefa 5: Integrar Atalho no Dashboard e Versão

**Arquivos:**
*   Modificar: `app/dashboard/page.tsx`
*   Modificar: `package.json`

**Interfaces:**
*   Modifica: Rota `/dashboard` para exibir um botão/card redirecionando para `/pluto/budget`.
*   Modifica: Bumping da versão do projeto para `0.2.0`.

- [ ] **Passo 1: Alterar `app/dashboard/page.tsx`**
    *   Substituir o estado simples por um atalho elegante para a financeira Héstia:
    ```typescript
    import Link from "next/link";

    export default function DashboardPage() {
      return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
          <div className="border-b pb-4">
            <h1 className="text-2xl font-bold tracking-tight">Painel de Ferramentas</h1>
            <p className="text-sm text-muted-foreground">Acesse seus utilitários familiares.</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Link
              href="/pluto/budget"
              className="group flex flex-col gap-2 rounded-lg border p-6 hover:bg-muted/40 transition-colors"
            >
              <h2 className="text-lg font-bold group-hover:text-primary transition-colors">
                Héstia Financeira 💰
              </h2>
              <p className="text-sm text-muted-foreground">
                Acesse o controle de orçamento anual, categorias de receitas e despesas previstas.
              </p>
            </Link>
          </div>
        </div>
      );
    }
    ```

- [ ] **Passo 2: Incrementar a versão em `package.json`**
    *   Alterar o campo `"version"` de `0.1.0` para `0.2.0` (indicando o lançamento da feature minor 1 de orçamento).

- [ ] **Passo 3: Rodar regressão de lint e compilação**
    *   Run: `npm run test`
    *   Run: `npx eslint .`
    *   Run: `npx tsc --noEmit`
    *   Expected: Sucesso em todos, sem erros de linter ou tipagem.

- [ ] **Passo 4: Commit de integração e fechamento do plano**
    *   Run: `git add app/dashboard/page.tsx package.json`
    *   Run: `node .agents/scripts/sdd.js commit "feat: integra atalho no dashboard e atualiza versao para 0.2.0"`
