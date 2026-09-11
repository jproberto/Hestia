# Abertura de Mês Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

**Objetivo:** Permitir a abertura operacional explícita de meses orçamentários para possibilitar futuros lançamentos e assegurar restrições de alterações financeiras.

**Arquitetura:** Criação de uma tabela de banco de dados independente (`monthly_periods`) no Supabase, contendo as funções de leitura e atualização no backend (`lib/pluto/db/months.ts`), uma interface de gerenciamento anual no Next.js (`app/pluto/months/page.tsx`) e atalhos de navegação entre o Dashboard e as telas de finanças.

**Tech Stack:** Next.js (App Router, React 18, React DOM), Tailwind CSS, TypeScript, Supabase, Vitest, Testing Library.

## Restrições Globais

* **Versionamento:** Atualizar a versão do projeto no `package.json` para `0.4.0` (SemVer minor) na última tarefa.
* **Segurança de Banco:** Todas as consultas e escritas na nova tabela devem possuir RLS ativo, permitindo acesso apenas a usuários autenticados.
* **Auditoria Transparente:** O e-mail do usuário criador deve ser salvo no campo `created_by` no formato `TEXT` (sem chaves estrangeiras com a tabela `auth.users` do Supabase).
* **CLI de Automação:** O progresso do plano e os commits devem ser executados estritamente pelo script `.agents/scripts/sdd.js`.
* **Sem Placeholders:** Todo código proposto nas tarefas deve ser drop-in e completo.

---

### Tarefa 1: Migração do Banco de Dados

**Arquivos:**
* Criar: `utils/migrations/migration-feature-3.sql`

**Interfaces:**
* Produz: Tabela física `public.monthly_periods` com colunas de chave primária, ano, mês, status e metadados de auditoria.

**Passo 1: Executar o início da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 1`

**Passo 2: Escrever a migração SQL completa**
Criar o arquivo `utils/migrations/migration-feature-3.sql` com as definições de tabela, restrições, RLS, políticas e registro correspondente na tabela de auditoria de migrações:

```sql
-- 1. Criar a tabela de controle de períodos mensais
CREATE TABLE IF NOT EXISTS public.monthly_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL CHECK (year >= 2026),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    status TEXT NOT NULL CHECK (status IN ('aberto', 'encerrado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_by TEXT NOT NULL,
    CONSTRAINT unique_year_month UNIQUE (year, month)
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.monthly_periods ENABLE ROW LEVEL SECURITY;

-- 3. Criar Política de Acesso para Usuários Autenticados
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.monthly_periods;
CREATE POLICY "Permitir tudo para autenticados" ON public.monthly_periods 
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Registrar a execução do script na tabela de controle de migrações
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
    '04',
    'Abertura de Mês',
    'migration-feature-3.sql',
    'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
```

**Passo 3: Validar o script SQL**
Como o banco de dados para os testes locais roda inteiramente sob mocks, valide visualmente se o DDL do arquivo é válido e segue as diretrizes em `db-preferences.md`.

**Passo 4: Finalizar e marcar como concluída no CLI**
Run: `node .agents/scripts/sdd.js task-complete 1`

**Passo 5: Commit**
Run:
```bash
git add utils/migrations/migration-feature-3.sql
node .agents/scripts/sdd.js commit "feat: adiciona migracao sql para controle de periodos mensais"
```

---

### Tarefa 2: Abstração de Acesso a Dados (Lib / DB)

**Arquivos:**
* Criar: `lib/pluto/db/months.ts`
* Testar: `__tests__/lib/pluto/db/months.test.ts`

**Interfaces:**
* Consome: Tabela `public.monthly_periods`
* Produz:
  * `interface MonthlyPeriod`
  * `getMonthlyPeriods(supabase: SupabaseClient, year: number): Promise<MonthlyPeriod[]>`
  * `openMonthlyPeriod(supabase: SupabaseClient, year: number, month: number, email: string): Promise<void>`
  * `closeMonthlyPeriod(supabase: SupabaseClient, year: number, month: number, email: string): Promise<void>`

**Passo 1: Iniciar a tarefa no CLI**
Run: `node .agents/scripts/sdd.js task-start 2`

**Passo 2: Escrever os testes que falham**
Criar o arquivo `__tests__/lib/pluto/db/months.test.ts` mockando o cliente Supabase para testar as operações da lib:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod } from "@/lib/pluto/db/months";
import { SupabaseClient } from "@supabase/supabase-js";

const mockSupabase = {
  from: vi.fn(),
} as unknown as SupabaseClient;

describe("Serviço de Períodos Mensais", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar periodos de um ano ordenados por mes", async () => {
    const mockData = [
      { id: "1", year: 2026, month: 1, status: "aberto", created_by: "user@hestia.com" },
      { id: "2", year: 2026, month: 2, status: "encerrado", created_by: "user@hestia.com" }
    ];

    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null })
      })
    });

    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({ select: selectMock });

    const periods = await getMonthlyPeriods(mockSupabase, 2026);
    expect(periods).toHaveLength(2);
    expect(periods[0].month).toBe(1);
    expect(periods[1].status).toBe("encerrado");
  });

  it("deve abrir um periodo utilizando upsert", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({ upsert: upsertMock });

    await openMonthlyPeriod(mockSupabase, 2026, 3, "user@hestia.com");
    expect(upsertMock).toHaveBeenCalledWith({
      year: 2026,
      month: 3,
      status: "aberto",
      created_by: "user@hestia.com"
    }, { onConflict: "year,month" });
  });

  it("deve encerrar um periodo utilizando upsert", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    const fromMock = mockSupabase.from as unknown as {
      mockReturnValue: (val: unknown) => unknown;
    };
    fromMock.mockReturnValue({ upsert: upsertMock });

    await closeMonthlyPeriod(mockSupabase, 2026, 3, "user@hestia.com");
    expect(upsertMock).toHaveBeenCalledWith({
      year: 2026,
      month: 3,
      status: "encerrado",
      created_by: "user@hestia.com"
    }, { onConflict: "year,month" });
  });
});
```

**Passo 3: Executar o teste e garantir que falha**
Run: `npx vitest run __tests__/lib/pluto/db/months.test.ts`
Expected: FAIL (Cannot find module '@/lib/pluto/db/months')

**Passo 4: Criar a implementação mínima**
Criar o arquivo `lib/pluto/db/months.ts`:

```typescript
import { SupabaseClient } from "@supabase/supabase-js";

export interface MonthlyPeriod {
  id: string;
  year: number;
  month: number;
  status: 'aberto' | 'encerrado';
  created_at: string;
  created_by: string;
}

export async function getMonthlyPeriods(
  supabase: SupabaseClient,
  year: number
): Promise<MonthlyPeriod[]> {
  const { data, error } = await supabase
    .from("monthly_periods")
    .select("*")
    .eq("year", year)
    .order("month", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function openMonthlyPeriod(
  supabase: SupabaseClient,
  year: number,
  month: number,
  email: string
): Promise<void> {
  const { error } = await supabase
    .from("monthly_periods")
    .upsert({
      year,
      month,
      status: "aberto",
      created_by: email
    }, { onConflict: "year,month" });

  if (error) throw error;
}

export async function closeMonthlyPeriod(
  supabase: SupabaseClient,
  year: number,
  month: number,
  email: string
): Promise<void> {
  const { error } = await supabase
    .from("monthly_periods")
    .upsert({
      year,
      month,
      status: "encerrado",
      created_by: email
    }, { onConflict: "year,month" });

  if (error) throw error;
}
```

**Passo 5: Executar os testes e garantir que passam**
Run: `npx vitest run __tests__/lib/pluto/db/months.test.ts`
Expected: PASS

**Passo 6: Concluir e marcar tarefa como concluída**
Run: `node .agents/scripts/sdd.js task-complete 2`

**Passo 7: Commit**
Run:
```bash
git add lib/pluto/db/months.ts __tests__/lib/pluto/db/months.test.ts
node .agents/scripts/sdd.js commit "feat: adiciona servico e testes para gerenciamento de periodos mensais"
```

---

### Tarefa 3: Tela de Gestão de Meses (UI Next.js)

**Arquivos:**
* Criar: `app/pluto/months/page.tsx`
* Testar: `__tests__/app/pluto/months-page.test.tsx`

**Interfaces:**
* Consome:
  * Componentes do UI do Shadcn (`@/components/ui/button`, etc.)
  * Funções da lib `getMonthlyPeriods`, `openMonthlyPeriod`, `closeMonthlyPeriod` de `@/lib/pluto/db/months`
  * Supabase Client de `@/utils/supabase/client`

**Passo 1: Iniciar a tarefa no CLI**
Run: `node .agents/scripts/sdd.js task-start 3`

**Passo 2: Escrever testes unitários para a página**
Criar `__tests__/app/pluto/months-page.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import MonthsPage from "@/app/pluto/months/page";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod } from "@/lib/pluto/db/months";

vi.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: "teste@hestia.com" } } })
    }
  })
}));

vi.mock("@/lib/pluto/db/months", () => ({
  getMonthlyPeriods: vi.fn(),
  openMonthlyPeriod: vi.fn(),
  closeMonthlyPeriod: vi.fn(),
}));

describe("Página de Gestão de Meses /pluto/months", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("deve renderizar os 12 meses do ano e exibir status inicial 'Não Iniciado'", async () => {
    (getMonthlyPeriods as Mock).mockResolvedValue([]);

    render(<MonthsPage />);

    expect(await screen.findByText("Janeiro")).toBeInTheDocument();
    expect(screen.getByText("Dezembro")).toBeInTheDocument();

    const notOpenedBadges = screen.getAllByText("Não Iniciado");
    expect(notOpenedBadges).toHaveLength(12);

    const openButtons = screen.getAllByRole("button", { name: "Abrir Mês" });
    expect(openButtons).toHaveLength(12);
  });

  it("deve permitir abrir um mês não iniciado", async () => {
    (getMonthlyPeriods as Mock).mockResolvedValue([]);
    (openMonthlyPeriod as Mock).mockResolvedValue(undefined);

    render(<MonthsPage />);

    const openBtn = await screen.findAllByRole("button", { name: "Abrir Mês" });
    fireEvent.click(openBtn[0]); // Clica no botão de Janeiro

    await waitFor(() => {
      expect(openMonthlyPeriod).toHaveBeenCalledWith(expect.any(Object), 2026, 1, "teste@hestia.com");
    });
  });

  it("deve exibir status 'Aberto' e botão 'Encerrar Mês' se o período estiver aberto", async () => {
    (getMonthlyPeriods as Mock).mockResolvedValue([
      { id: "1", year: 2026, month: 1, status: "aberto", created_by: "teste@hestia.com" }
    ]);

    render(<MonthsPage />);

    expect(await screen.findByText("Aberto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Encerrar Mês" })).toBeInTheDocument();
  });
});
```

**Passo 3: Executar o teste e garantir que falha**
Run: `npx vitest run __tests__/app/pluto/months-page.test.tsx`
Expected: FAIL (Cannot find module '@/app/pluto/months/page')

**Passo 4: Criar a implementação da página de Gestão de Meses**
Criar `app/pluto/months/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod, MonthlyPeriod } from "@/lib/pluto/db/months";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function MonthsPage() {
  const [year, setYear] = useState<number>(2026);
  const [periods, setPeriods] = useState<MonthlyPeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  const supabase = createClient();

  const loadPeriods = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }

      const data = await getMonthlyPeriods(supabase, year);
      setPeriods(data);
    } catch (err) {
      console.error("Erro ao carregar períodos:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [year, supabase]);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  const handleOpenMonth = async (monthIndex: number) => {
    if (!userEmail) return;
    setActionLoading((prev) => ({ ...prev, [monthIndex]: true }));
    try {
      await openMonthlyPeriod(supabase, year, monthIndex, userEmail);
      await loadPeriods(true);
    } catch (err) {
      console.error("Erro ao abrir mês:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [monthIndex]: false }));
    }
  };

  const handleCloseMonth = async (monthIndex: number) => {
    if (!userEmail) return;
    setActionLoading((prev) => ({ ...prev, [monthIndex]: true }));
    try {
      await closeMonthlyPeriod(supabase, year, monthIndex, userEmail);
      await loadPeriods(true);
    } catch (err) {
      console.error("Erro ao encerrar mês:", err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [monthIndex]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando períodos...</p>
      </div>
    );
  }

  // Métricas do resumo
  const totalOpen = periods.filter((p) => p.status === "aberto").length;
  const totalClosed = periods.filter((p) => p.status === "encerrado").length;
  const totalNotStarted = 12 - (totalOpen + totalClosed);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      {/* Menu Superior Financeiro */}
      <div className="flex border-b pb-1 gap-6">
        <Link href="/pluto/budget" className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          Orçamento Anual
        </Link>
        <Link href="/pluto/months" className="pb-2 text-sm font-semibold border-b-2 border-primary text-foreground">
          Meses e Períodos
        </Link>
      </div>

      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meses e Períodos</h1>
          <p className="text-sm text-muted-foreground">Abra ou encerre meses operacionais para controle de lançamentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="year-select">Ano:</Label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded border p-1 bg-card text-card-foreground text-sm"
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>
      </div>

      {/* Resumo Anual */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border p-4 bg-muted/20">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Abertos</p>
          <p className="text-2xl font-bold text-emerald-600">{totalOpen}</p>
        </div>
        <div className="text-center border-x">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Encerrados</p>
          <p className="text-2xl font-bold text-rose-600">{totalClosed}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Não Iniciados</p>
          <p className="text-2xl font-bold text-zinc-500">{totalNotStarted}</p>
        </div>
      </div>

      {/* Grid de 12 meses */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MONTH_NAMES.map((name, index) => {
          const monthNum = index + 1;
          const period = periods.find((p) => p.month === monthNum);
          const isActLoading = actionLoading[monthNum] || false;

          let statusBadge = (
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
              Não Iniciado
            </span>
          );
          let actionButton = (
            <Button
              size="sm"
              className="w-full mt-2"
              disabled={isActLoading}
              onClick={() => handleOpenMonth(monthNum)}
            >
              {isActLoading ? "Processando..." : "Abrir Mês"}
            </Button>
          );

          if (period?.status === "aberto") {
            statusBadge = (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                Aberto
              </span>
            );
            actionButton = (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                disabled={isActLoading}
                onClick={() => handleCloseMonth(monthNum)}
              >
                {isActLoading ? "Processando..." : "Encerrar Mês"}
              </Button>
            );
          } else if (period?.status === "encerrado") {
            statusBadge = (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                Encerrado
              </span>
            );
            actionButton = (
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                disabled={isActLoading}
                onClick={() => handleOpenMonth(monthNum)}
              >
                {isActLoading ? "Processando..." : "Reabrir Mês"}
              </Button>
            );
          }

          return (
            <div key={name} className="flex flex-col justify-between rounded-lg border p-4 hover:shadow-md transition-shadow bg-card">
              <div>
                <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2">
                  <h3 className="font-bold text-sm">{name}</h3>
                  {statusBadge}
                </div>
                <p className="text-xs text-muted-foreground">
                  Período operacional do ano {year}.
                </p>
              </div>
              {actionButton}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Passo 5: Executar os testes e garantir que passam**
Run: `npx vitest run __tests__/app/pluto/months-page.test.tsx`
Expected: PASS

**Passo 6: Concluir e marcar tarefa como concluída**
Run: `node .agents/scripts/sdd.js task-complete 3`

**Passo 7: Commit**
Run:
```bash
git add app/pluto/months/page.tsx __tests__/app/pluto/months-page.test.tsx
node .agents/scripts/sdd.js commit "feat: cria tela de gestao de meses com grid interativo"
```

---

### Tarefa 4: Ajustes de Navegação e Finalização

**Arquivos:**
* Modificar: `app/dashboard/page.tsx`
* Modificar: `app/pluto/budget/page.tsx`
* Modificar: `package.json`
* Modificar: `.agents/backlog.md`

**Interfaces:**
* Consome: Navegação de `next/navigation`
* Produz: Links integrados entre Dashboard, Orçamento e Períodos.

**Passo 1: Iniciar a tarefa no CLI**
Run: `node .agents/scripts/sdd.js task-start 4`

**Passo 2: Integrar o link no Dashboard**
Modificar `app/dashboard/page.tsx` para adicionar o novo card de gestão de meses ao lado do orçamento:

```diff
@@ -32,16 +32,27 @@
           Sair 🚪
         </Button>
       </div>
-      <div className="grid grid-cols-2 gap-6">
+      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
+
+        <Link
+          href="/pluto/months"
+          className="group flex flex-col gap-2 rounded-lg border p-6 hover:bg-muted/40 transition-colors"
+        >
+          <h2 className="text-lg font-bold group-hover:text-primary transition-colors">
+            Meses e Períodos 📅
+          </h2>
+          <p className="text-sm text-muted-foreground">
+            Abra e encerre períodos mensais para permitir novos lançamentos e travar edições.
+          </p>
+        </Link>
       </div>
     </div>
```

**Passo 3: Adicionar a barra de abas superior na tela de Orçamento**
Modificar `app/pluto/budget/page.tsx` para incluir o menu de navegação de abas idêntico ao criado na tela de meses.
Use a ferramenta `replace_file_content` para inserir as abas no início do retorno da página de orçamento (por volta da linha 248):

```diff
@@ -246,6 +246,15 @@
 
   return (
     <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
+      {/* Menu Superior Financeiro */}
+      <div className="flex border-b pb-1 gap-6">
+        <Link href="/pluto/budget" className="pb-2 text-sm font-semibold border-b-2 border-primary text-foreground">
+          Orçamento Anual
+        </Link>
+        <Link href="/pluto/months" className="pb-2 text-sm font-medium text-muted-foreground hover:text-foreground">
+          Meses e Períodos
+        </Link>
+      </div>
+
       <div className="flex items-center justify-between border-b pb-4">
```
*Observação: Não esqueça de adicionar a importação de `Link` se ela não existir no topo de `app/pluto/budget/page.tsx` (já existe na linha 3).*

**Passo 4: Atualizar versão do package.json**
Modificar o arquivo `package.json` alterando o campo `"version"` de `"0.3.1"` para `"0.4.0"` (SemVer Minor).

**Passo 5: Rodar testes gerais de regressão e build**
Run: `npm run test`
Expected: ALL PASS
Run: `npx eslint .`
Expected: No errors
Run: `npx tsc --noEmit`
Expected: No errors
Run: `npm run build`
Expected: Success

**Passo 6: Concluir e marcar tarefa como concluída**
Run: `node .agents/scripts/sdd.js task-complete 4`

**Passo 7: Commit final do plano**
Run:
```bash
git add app/dashboard/page.tsx app/pluto/budget/page.tsx package.json
node .agents/scripts/sdd.js commit "feat: integra navegacao superior e atualiza versao do projeto para 0.4.0"
```

---

## Cenários de Teste Manuais de Aceitação

### Cenário 1: Fluxo de Abertura de Período Não Iniciado
* **Dado** que o usuário está autenticado e navega para `/pluto/months`.
* **Quando** o usuário seleciona o ano `2026` e visualiza o grid de cards.
* **Então** o card de `Janeiro` deve estar rotulado como **"Não Iniciado"** em cor cinza e com o botão **"Abrir Mês"** ativo.
* **Quando** o usuário clica no botão **"Abrir Mês"** de `Janeiro`.
* **Então** o botão deve entrar temporariamente em estado de carregamento e depois o card deve atualizar seu rótulo para **"Aberto"** em cor verde e exibir o botão **"Encerrar Mês"**.

### Cenário 2: Fluxo de Encerramento e Reabertura
* **Dado** que o mês de `Janeiro` está no status **"Aberto"**.
* **Quando** o usuário clica em **"Encerrar Mês"**.
* **Então** o card deve atualizar seu rótulo para **"Encerrado"** em cor vermelha/escura e exibir o botão **"Reabrir Mês"**.
* **Quando** o usuário clica em **"Reabrir Mês"**.
* **Então** o status do card deve transicionar de volta para **"Aberto"** (cor verde).
