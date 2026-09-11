# Relatório de Dívida Técnica e Riscos Arquiteturais — Héstia

**Data:** 2026-09-08  
**Origem:** Avaliação geral da estrutura, arquitetura e qualidade de código  
**Destino:** Insumo para specs/planos de refatoração e acompanhamento contínuo  
**Status:** **Aberto** — Itens serão convertidos em features do backlog estrutural conforme priorização

---

## Sumário Executivo

| Categoria | Itens | Críticos | Altos | Médios | Baixos |
|-----------|-------|----------|-------|--------|--------|
| **Arquitetura / Camadas** | 3 | 0 | 1 | 2 | 0 |
| **Qualidade de Código / God Components** | 2 | 1 | 0 | 1 | 0 |
| **Testes / Confiabilidade** | 3 | 0 | 1 | 2 | 0 |
| **Tipagem / Contratos** | 2 | 0 | 1 | 1 | 0 |
| **DX / Manutenibilidade** | 2 | 0 | 0 | 2 | 0 |
| **TOTAL** | **12** | **1** | **3** | **6** | **2** |

> **Legenda de Severidade:**  
> - **Crítico**: Bloqueia escalabilidade, causa bugs recorrentes ou impede novo módulo  
> - **Alto**: Dificulta manutenção, testes frágeis, viola princípio arquitetural importante  
> - **Médio**: Melhoria incrementável, não bloqueia entregas  
> - **Baixo**: Nice-to-have, polimento

---

## 1. Arquitetura e Camadas

### 1.1 [ALTO] **AUS-001** — Ausência de Camada de Casos de Uso (Use Cases / Interactors)
**Localização:** `lib/pluto/services/*.ts`  
**Descrição:** Services (`transactions.ts`, `budget.ts`, etc.) misturam orquestração de fluxo, validações de negócio e chamadas diretas a repositories/Supabase. Não há separação entre "o que o sistema faz" (caso de uso) e "como persiste" (repository).  
**Impacto:**
- Dificulta testar regras de negócio isoladamente (precisa mockar Supabase inteiro)
- Torna services inflexíveis para novos consumidores (ex: API pública, jobs, CLI)
- Viola **Single Responsibility** e **Dependency Inversion** (services dependem de implementação concreta `SupabaseClient`)

**Solução Proposta:**
```
lib/pluto/
├── use-cases/           # NOVO: Interactors puros (TS puro, sem Supabase)
│   ├── createTransaction.ts
│   ├── updateTransaction.ts
│   ├── adjustBudget.ts
│   └── ...
├── services/            # Mantém: orquestração + DI de repositories
│   └── transactions.ts  # Chama use-case + repository
└── repositories/        # Mantém: acesso a dados
```

**Critério de Aceite:**
- [ ] Cada service delega lógica de negócio para um use-case correspondente
- [ ] Use-cases recebem interfaces `ITransactionRepository`, `ICategoryRepository` (não `SupabaseClient`)
- [ ] Testes de use-cases usam mocks de interfaces (rápidos, determinísticos)
- [ ] Services tornam-se finos: autenticação, transação DB, logging, chamam use-case

---

### 1.2 [MÉDIO] **AUS-002** — Interface de Repositório Implícita (Sem Contrato Explícito)
**Localização:** `lib/pluto/repositories/*.ts`  
**Descrição:** Repositories exportam funções soltas (`getTransactionsByMonth`, `createTransaction`) mas não definem interface `ITransactionRepository`. Services importam funções diretamente, acoplando à implementação.  
**Impacto:** Impede substituição de implementação (ex: mock em testes, repository em memória, outro ORM) sem alterar consumers.

**Solução Proposta:**
```typescript
// lib/pluto/repositories/transactions.ts
export interface ITransactionRepository {
  getByMonth(year: number, month: number): Promise<TransactionWithDetails[]>;
  create(input: TransactionInput, email: string): Promise<TransactionWithDetails>;
  update(id: string, input: TransactionInput): Promise<TransactionWithDetails>;
  delete(id: string): Promise<void>;
}

// Implementação Supabase
export const supabaseTransactionRepository: ITransactionRepository = { ... };

// Services recebem via DI
export async function createTransactionService(
  repo: ITransactionRepository,
  data: CreateTransactionData,
  email: string
) { ... }
```

**Critério de Aceite:**
- [ ] Interfaces `I*Repository` definidas para cada repositório
- [ ] Services recebem repositórios por parâmetro (DI)
- [ ] Testes de services usam implementations em memória/fakes

---

### 1.3 [MÉDIO] **AUS-003** — Tipagem de `SupabaseClient` Vazando nas Camadas de Domínio
**Localização:** `lib/pluto/repositories/*.ts`, `lib/pluto/services/*.ts`  
**Descrição:** `import { SupabaseClient } from "@supabase/supabase-js"` aparece em repositories e services. Camada de domínio conhece detalhes de infraestrutura.  
**Impacto:** Acoplamento a biblioteca externa; dificulta migração futura; testes precisam mockar API complexa do Supabase.

**Solução:** Encapsular em `lib/shared/database.ts`:
```typescript
// lib/shared/database.ts
export interface IDatabaseClient {
  from(table: string): IQueryBuilder;
  // métodos mínimos necessários
}
export interface IQueryBuilder {
  select(columns?: string): IQueryBuilder;
  eq(column: string, value: unknown): IQueryBuilder;
  // ...
  single(): Promise<{ data: T | null; error: Error | null }>;
}
```

**Critério de Aceite:**
- [ ] Nenhum `import { SupabaseClient }` fora de `utils/supabase/` e `lib/shared/database.ts`
- [ ] Repositories usam `IDatabaseClient` injetado

---

## 2. Qualidade de Código — God Components

### 2.1 [CRÍTICO] **GOD-001** — `TransactionsPage.tsx` (~1300 linhas) — God Component
**Localização:** `app/pluto/transactions/page.tsx`  
**Descrição:** Componente único gerencia:
- Fetch de 6+ entidades (transactions, accounts, categories, budgets, checklist, periods)
- Estado complexo (15+ `useState`, 8+ `useCallback`, `useMemo`, `useEffect`)
- Lógica de negócio: cálculo orçado vs real, overflow de budget, agregação por conta/categoria
- 4 modais completos (Transação, Conta, Exclusão, Budget Overflow)
- Renderização de 3 tabelas + grid de cards + seletores + saldo

**Impacto:**
- **Impossível testar unitariamente** — lógica misturada com UI
- **Ciclo de feedback lento** — qualquer mudança exige rebuild completo
- **Onboarding difícil** — novo dev leva horas para entender o fluxo
- **Reutilização zero** — lógica de "orçado vs real" presa no componente
- **Viola SRP** — 5+ responsabilidades distintas

**Métricas:**
| Métrica | Valor | Limite Recomendado |
|---------|-------|-------------------|
| Linhas | ~1300 | < 300 |
| `useState` | 15+ | < 5 |
| `useEffect` | 2+ | < 2 |
| Modais inline | 4 | 0 (extrair) |
| Responsabilidades | 6+ | 1 |

**Plano de Decomposição (Fases):**

#### Fase 1 — Extrair Hooks de Lógica (Semana 1)
| Hook | Responsabilidade | Arquivo Alvo |
|------|------------------|--------------|
| `usePlutoData` | Fetch orquestrado de todas as entidades | `lib/pluto/hooks/usePlutoData.ts` |
| `useBudgetComparison` | Cálculo orçado vs real (receitas/despesas) | `lib/pluto/hooks/useBudgetComparison.ts` |
| `useAccountAggregation` | Agrupamento transações por conta/cartão | `lib/pluto/hooks/useAccountAggregation.ts` |
| `useChecklistLogic` | Toggle, overflow check, trigger transaction | `lib/pluto/hooks/useChecklistLogic.ts` |

#### Fase 2 — Extrair Componentes de UI (Semana 2)
| Componente | Props Principais | Arquivo Alvo |
|------------|------------------|--------------|
| `BudgetComparisonSection` | `receitaRows`, `despesaRows`, `totals` | `components/pluto/BudgetComparisonSection.tsx` |
| `AccountCardGrid` | `accountCardsList`, `onOpenTxModal` | `components/pluto/AccountCardGrid.tsx` |
| `TransactionModal` | `isOpen`, `onClose`, `onSave`, `initialData` | `components/pluto/TransactionModal.tsx` |
| `AccountModal` | `isOpen`, `onClose`, `onSave` | `components/pluto/AccountModal.tsx` |
| `DeleteConfirmModal` | `isOpen`, `onClose`, `onConfirm`, `item` | `components/pluto/DeleteConfirmModal.tsx` |
| `BudgetOverflowModal` | (já existe) | — |

#### Fase 3 — Página Enxuta (Semana 3)
`page.tsx` passa a ser:
```tsx
export default function TransactionsPage() {
  const { data, loading, error, refetch } = usePlutoData();
  const budget = useBudgetComparison(data.transactions, data.budgetItems);
  const accounts = useAccountAggregation(data.transactions, data.accounts);
  const checklist = useChecklistLogic(data.checklistItems, ...);

  return (
    <PlutoLayout pageTitle="Lançamentos" pageSubtitle={...}>
      {error && <ErrorAlert message={error} />}
      <YearMonthSelector ... />
      <BudgetComparisonSection {...budget} />
      <ChecklistCard {...checklist} />
      <AccountCardGrid {...accounts} onOpenTxModal={...} />
      <TransactionModal ... />
      <AccountModal ... />
    </PlutoLayout>
  );
}
```

**Critério de Aceite:**
- [ ] `page.tsx` < 200 linhas
- [ ] Cada hook testável isoladamente (unit tests > 80% coverage)
- [ ] Cada componente UI testável com React Testing Library
- [ ] Zero lógica de negócio no componente de página
- [ ] Storybook stories para componentes extraídos

---

### 2.2 [MÉDIO] **GOD-002** — `ChecklistCard.tsx` (367 linhas) — Componente Composto Grande
**Localização:** `components/pluto/ChecklistCard.tsx`  
**Descrição:** Gerencia lista, ordenação, badges de urgência, overflow de budget, 3 modais (add/edit/delete), callbacks complexos.  
**Impacto:** Similar ao GOD-001 mas em escala menor. Dificulta testes de edge cases (overflow, urgência, global vs monthly).

**Solução:** Extrair:
- `useChecklistItems` — lógica de sorting, urgência, totais por categoria
- `ChecklistItemRow` — linha individual com checkbox, badge, ações
- `ChecklistOverflowAlerts` — lista de avisos de overflow
- Modais já existem (`ChecklistItemFormModal`, `ChecklistItemDeleteModal`) — **bom**

**Critério de Aceite:**
- [ ] `ChecklistCard` < 150 linhas (apenas composição)
- [ ] `useChecklistItems` testado unitariamente
- [ ] `ChecklistItemRow` com storybook

---

## 3. Testes e Confiabilidade

### 3.1 [ALTO] **TST-001** — Mocks de Supabase Frágeis e Acoplados à Implementação
**Localização:** `__tests__/lib/pluto/db/*.test.ts`, `__tests__/setup.ts`  
**Descrição:** Mocks encadeiam `.from().select().eq().eq().maybeSingle()` — qualquer mudança na query (ordem de `.eq()`, adição de `.order()`) quebra testes sem alterar comportamento real.  
**Impacto:**
- Falsos negativos frequentes
- Testes não validam comportamento, validam **sintaxe da query**
- Desencoraja refatoração de repositories (medo de quebrar testes)

**Exemplo Problemático:**
```typescript
// Atual — frágil
fromMock.mockImplementation((table) => {
  if (table === "transactions") {
    return {
      select: () => ({ gte: () => ({ lte: () => ({ order: () => ({ order: () => ... }) }) }) })
    };
  }
});
```

**Solução Proposta:**
1. **MSW (Mock Service Worker)** — Intercepta requisições HTTP reais do Supabase client
2. **Ou**: Repository Fakes em memória (`lib/pluto/repositories/fakes/`)
   ```typescript
   // lib/pluto/repositories/fakes/transactionRepository.ts
   export function createFakeTransactionRepository(initialData: TransactionWithDetails[] = []) {
     let data = [...initialData];
     return {
       getByMonth: async (year, month) => data.filter(...),
       create: async (input) => { const n = {...input, id: uuid()}; data.push(n); return n; },
       // ...
     };
   }
   ```

**Critério de Aceite:**
- [ ] Testes de services/use-cases usam fakes em memória (rápidos, determinísticos)
- [ ] Testes de repositories (integração) usam **testcontainers** ou Supabase local real
- [ ] Zero mocks de `.from().select().eq()...` em testes de lógica de negócio

---

### 3.2 [MÉDIO] **TST-002** — Ausência de Testes de Contrato (Contract Tests)
**Localização:** N/A (não existe)  
**Descrição:** Não há validação de que `ITransactionRepository` (quando criado — ver AUS-002) é implementado corretamente pela versão Supabase e pela versão Fake.  
**Impacto:** Fake pode divergir da implementação real → testes passam mas produção falha.

**Solução:** Test suite compartilhada:
```typescript
// lib/pluto/repositories/contracts/transactionRepository.contract.ts
export function testTransactionRepository(
  createRepo: () => Promise<ITransactionRepository>
) {
  describe("ITransactionRepository contract", () => {
    it("create + getByMonth roundtrip", async () => { ... });
    it("update preserves unchanged fields", async () => { ... });
    // ...
  });
}

// Uso:
describe("SupabaseTransactionRepository", () => {
  testTransactionRepository(() => Promise.resolve(supabaseTransactionRepository));
});
describe("FakeTransactionRepository", () => {
  testTransactionRepository(() => Promise.resolve(createFakeTransactionRepository()));
});
```

**Critério de Aceite:**
- [ ] Suite de contrato roda contra todas as implementações
- [ ] CI falha se fake diverge de implementação real

---

### 3.3 [MÉDIO] **TST-003** — Cobertura de Testes de UI Limitada a Smoke Tests
**Localização:** `__tests__/app/pluto/*.test.tsx`, `__tests__/components/pluto/*.test.tsx`  
**Descrição:** Testes atuais renderizam componente e verificam se não crasham. Poucos testam interações (cliques, inputs, fluxos modais).  
**Impacto:** Regressões de UX não detectadas (ex: modal não abre, validação não impede submit).

**Solução:** Adotar **Testing Library user-event** para fluxos críticos:
- Criar transação via modal (preencher campos → submit → lista atualiza)
- Editar checklist item → toggle completion → trigger transaction modal
- Budget overflow → confirmar ajuste → orçamento atualizado

**Critério de Aceite:**
- [ ] Top 5 fluxos críticos cobertos por testes de interação
- [ ] Testes rodam em < 30s no CI

---

## 4. Tipagem e Contratos

### 4.1 [ALTO] **TYP-001** — Validação de Runtime Ausente (Zod / Valibot)
**Localização:** `lib/pluto/services/*.ts`, `app/pluto/transactions/page.tsx` (form handlers)  
**Descrição:** Tipos TypeScript existem mas não validam entrada em runtime (formulários, Supabase responses, API boundaries).  
**Impacto:**
- Dados inválidos do Supabase (migração, admin direto) causam erros silenciosos ou crashes
- Formulários aceitam valores que types rejeitariam (ex: `amount: "abc"` vira `NaN`)
- "TypeScript não roda em produção"

**Solução:** Schemas Zod em `lib/pluto/schemas/`:
```typescript
// lib/pluto/schemas/transaction.ts
export const createTransactionSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  type: z.enum(["receita", "despesa"]),
  is_refund: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category_id: z.string().uuid(),
  account_id: z.string().uuid(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Uso no service:
export async function createTransactionWithValidation(
  repo: ITransactionRepository,
  rawData: unknown,
  email: string
) {
  const data = createTransactionSchema.parse(rawData); // throw se inválido
  // ...
}
```

**Critério de Aceite:**
- [ ] Schemas Zod para todos os inputs públicos (forms, APIs, Supabase responses)
- [ ] `parse` / `safeParse` usado nas boundaries (services, server actions)
- [ ] Tipos TypeScript derivados de `z.infer<>` (single source of truth)

---

### 4.2 [MÉDIO] **TYP-002** — Tipos Duplicados entre Repositories e Services
**Localização:** `lib/pluto/repositories/transactions.ts` vs `lib/pluto/services/transactions.ts`  
**Descrição:** `TransactionInput`, `TransactionWithDetails` definidos em repositories e re-exportados/usados em services. `CreateTransactionData` em services duplica campos com nomes ligeiramente diferentes (`account_name` vs `account_id`).  
**Impacto:** Manutenção dupla; divergência sutil causa bugs (ex: service passa `account_name` mas repo espera `account_id`).

**Solução:** Tipos compartilhados em `lib/pluto/types.ts` (já existe — **consolidar lá**):
```typescript
// lib/pluto/types.ts — fonte única
export interface TransactionRow { ... }
export interface TransactionInput { ... } // para repository (ids)
export interface CreateTransactionFormData { ... } // para form/UI (nomes)
export interface TransactionWithDetails extends TransactionRow { ... }

// Services fazem mapping: FormData → RepositoryInput
```

**Critério de Aceite:**
- [ ] Zero tipos duplicados entre layers
- [ ] Mapping explícito documentado (form → service → repo)

---

## 5. Developer Experience e Manutenibilidade

### 5.1 [MÉDIO] **DX-001** — Ausência de Storybook / Documentação Visual de Componentes
**Localização:** `components/pluto/`, `components/ui/`  
**Descrição:** Componentes não têm stories. Novos devs não sabem como usar `ChecklistCard`, `BudgetOverflowModal`, `ModuleLayout` sem ler implementação.  
**Impacto:** Onboarding lento; reutilização baixa; inconsistências visuais.

**Solução:** Adicionar Storybook (já compatível com Next.js + Tailwind):
```bash
npx storybook@latest init --type react
```
Criar stories para:
- `ModuleLayout` (variações: com/sem nav, com/sem pageHeader)
- `ChecklistCard` (estados: vazio, com itens, overflow, loading)
- `TransactionModal` (create vs edit, com conta pré-fixada)
- `BudgetComparisonSection` (receitas/despesas, vazias, com totais)

**Critério de Aceite:**
- [ ] Storybook rodando localmente (`npm run storybook`)
- [ ] Stories para 100% componentes `components/pluto/`
- [ ] CI roda `build-storybook` (valida compilação)

---

### 5.2 [MÉDIO] **DX-002** — Scripts de Dev/Debug Ausentes para Novo Módulo
**Localização:** `package.json`, `.agents/scripts/`  
**Descrição:** Criar novo módulo exige copiar/colar estrutura manualmente (pastas, imports, exports, backlogs).  
**Impacto:** Erros de digitação; inconsistências; atrito para adotar padrão.

**Solução:** Script gerador (CLI simples):
```bash
# .agents/scripts/new-module.js
node .agents/scripts/new-module.js atlas "Atlas" "/mascots/atlas.png" "#123456"
```
Cria:
- `app/atlas/` + `layout.tsx` + `page.tsx` (placeholder)
- `components/atlas/` + `AtlasLayout.tsx` (extends ModuleLayout)
- `lib/atlas/` + `repositories/`, `services/`, `types.ts`, `utils.ts`
- `__tests__/lib/atlas/` + `__tests__/app/atlas/` + `__tests__/components/atlas/`
- `.agents/atlas/backlog.md` + `specs/` + `plans/` + `logs/`
- Atualiza `lib/modules.ts` e `.agents/backlog.md` (tabela módulos)

**Critério de Aceite:**
- [ ] Comando único cria estrutura completa compilável
- [ ] Novo módulo aparece no `lib/modules.ts` e backlog central
- [ ] `npm run dev` roda sem erros no módulo vazio

---

## 6. Rastreamento e Priorização Sugerida

### Backlog Estrutural Proposto (para `.agents/backlog.md`)

| ID | Feature | Severidade | Esforço | Dependências | Status |
|----|---------|------------|---------|--------------|--------|
| 27 | **Refatorar TransactionsPage — Fase 1: Hooks** | Crítico | M | — | Pendente |
| 28 | **Refatorar TransactionsPage — Fase 2: Componentes UI** | Crítico | M | #27 | Pendente |
| 29 | **Refatorar TransactionsPage — Fase 3: Página Enxuta** | Crítico | S | #28 | Pendente |
| 30 | **Introduzir Camada Use Cases (Interactors)** | Alto | M | AUS-002 | Pendente |
| 31 | **Definir Interfaces de Repositório (I*Repository)** | Alto | S | — | Pendente |
| 32 | **Encapsular SupabaseClient (IDatabaseClient)** | Alto | S | #31 | Pendente |
| 33 | **Substituir Mocks Frágeis por Fakes em Memória** | Alto | M | #31 | Pendente |
| 34 | **Adicionar Validação Runtime com Zod** | Alto | M | — | Pendente |
| 35 | **Consolidar Tipos em lib/pluto/types.ts** | Médio | S | — | Pendente |
| 36 | **Testes de Contrato para Repositories** | Médio | S | #31, #33 | Pendente |
| 37 | **Testes de Interação (User Flows) Críticos** | Médio | M | #29 | Pendente |
| 38 | **Storybook para Componentes Pluto** | Médio | S | #28 | Pendente |
| 39 | **CLI Gerador de Novo Módulo** | Médio | M | — | Pendente |
| 40 | **Refatorar ChecklistCard (Hooks + Rows)** | Médio | S | — | Pendente |

> **Nota:** Itens 27-29 são sequenciais e devem ser feitos na ordem. Itens 30-33 formam a fundação de Clean Architecture e devem preceder novos módulos complexos.

---

## 7. Como Usar Este Relatório

1. **Para nova feature:** Consulte se toca em algum item acima → inclua refatoração no plano se necessário (boy scout rule)
2. **Para planning:** Priorize itens **Crítico/Alto** antes de features de alto acoplamento
3. **Para code review:** Verifique se PR introduz padrões que agravam itens listados
4. **Para retrospectiva:** Atualize status, adicione novos itens, reavalie severidade
5. **Para onboarding:** Entregue este doc ao novo dev — explica "por que o código é assim" e "para onde vamos"

---

## 8. Próximos Passos Imediatos

- [ ] Converter itens **Crítico/Alto** em entries no `.agents/backlog.md` (backlog estrutural)
- [ ] Criar **spec** para item #27 (Fase 1 hooks) via `sdd-01-brainstorm`
- [ ] Definir **owner** e **target date** por item
- [ ] Agendar **revisão quinzenal** deste relatório (atualizar status, fechar resolvidos, adicionar novos)

---

**Fim do Relatório**  
*Este documento deve ser versionado e atualizado a cada ciclo de refatoração ou descoberta de nova dívida.*