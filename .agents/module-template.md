# Template de Módulo - Héstia

Use este template ao criar um novo módulo. O objetivo é consistência para que múltiplos agentes possam trabalhar em paralelo.

---

## Estrutura de Pastas

```
lib/<modulo>/
  repositories/     # Acesso a dados (Supabase) - uma por tabela/entidade
  services/         # Regras de negócio, orquestração, validações
  hooks/            # React hooks para busca de dados e mutações
  types.ts          # Tipos TypeScript compartilhados (exportados publicamente)
  index.ts          # Barrel export: exporta API pública do módulo

components/<modulo>/
  *.tsx             # Componentes React (Client Components)
  ui/               # Componentes de UI específicos do módulo (opcional)

app/<modulo>/
  page.tsx          # Server Component (ou Client se precisar de interação)
  layout.tsx        # Layout do módulo (opcional)
  */page.tsx        # Sub-páginas

__tests__/lib/<modulo>/
  *.test.ts         # Testes unitários (repositories, services, utils)

__tests__/components/<modulo>/
  *.test.tsx        # Testes de componentes

__tests__/app/<modulo>/
  *.test.tsx        # Testes de integração de página
```

---

## Convenções de Código

### Repositories (`lib/<modulo>/repositories/`)
- Uma função por operação: `getX`, `createX`, `updateX`, `deleteX`
- Recebem `supabase: SupabaseClient` como primeiro parâmetro
- Lançam erro nativo do Supabase (não encapsulam)
- Retornam tipos definidos em `types.ts`
- **Não contêm regras de negócio** - apenas CRUD

```ts
// repositories/transactions.ts
export async function getTransactionsByMonth(
  supabase: SupabaseClient,
  year: number,
  month: number
): Promise<TransactionWithDetails[]> { ... }
```

### Services (`lib/<modulo>/services/`)
- Contêm regras de negócio, validações, orquestração
- Chamam repositories (não Supabase direto)
- Funções puras onde possível, async quando precisar de DB
- Ex: `createTransactionWithValidation`, `adjustBudgetWithOverflowCheck`

```ts
// services/transactions.ts
export async function createTransactionWithValidation(
  supabase: SupabaseClient,
  input: TransactionInput,
  email: string
): Promise<TransactionWithDetails> {
  // valida período, cria categoria/conta se necessário, chama repository
}
```

### Hooks (`lib/<modulo>/hooks/`)
- Um hook por entidade principal: `useTransactions`, `useBudgets`, `useChecklist`
- Encapsulam `useState`, `useEffect`, `fetchData`, `loading`, `error`
- Retornam `{ data, loading, error, refetch, mutate }`
- Pages ficam limpas: apenas renderização

```ts
// hooks/useTransactions.ts
export function useTransactions(year: number, month: number) {
  const [data, setData] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const refetch = useCallback(async () => { ... }, [year, month]);
  
  useEffect(() => { refetch(); }, [refetch]);
  
  return { data, loading, error, refetch };
}
```

### Types (`lib/<modulo>/types.ts`)
- Tipos de domínio: `Transaction`, `TransactionInput`, `TransactionWithDetails`
- Tipos de resposta: `BudgetItem`, `BudgetAdjustment`
- Enums/constantes: `TransactionType`, `AccountType`
- **Não** tipos de UI (esses ficam nos componentes)

### Index (`lib/<modulo>/index.ts`)
```ts
export * from "./types";
export * from "./repositories";
export * from "./services";
export * from "./hooks";
```

---

## Checklist para Novo Módulo

- [ ] Criar `.agents/<modulo>/backlog.md` e adicionar na tabela de módulos do backlog central
- [ ] Criar estrutura de pastas (`lib/`, `components/`, `app/`, `__tests__/`)
- [ ] Definir `types.ts` primeiro (contrato)
- [ ] Implementar `repositories/` (acesso a dados)
- [ ] Implementar `services/` (regras de negócio)
- [ ] Implementar `hooks/` (busca de dados para UI)
- [ ] Criar `index.ts` barrel export
- [ ] Criar componentes em `components/<modulo>/`
- [ ] Criar página em `app/<modulo>/page.tsx` usando hooks
- [ ] Escrever testes: repositories, services, hooks, componentes, página
- [ ] Rodar `npm test` e `npm run lint` - tudo deve passar
- [ ] Atualizar `.agents/backlog.md` com status do módulo

---

## Princípios não-negociáveis

1. **Pages não chamam Supabase direto** → usam hooks
2. **Hooks não chamam Supabase direto** → chamam services
3. **Services não chamam Supabase direto** → chamam repositories
4. **Repositories** são a única camada que toca Supabase
5. **Tipos compartilhados** vivem em `types.ts` e são exportados pelo `index.ts`
6. **Utils compartilhadas** vêm de `@/lib/shared/` (date, currency, utils)
7. **Testes testam comportamento**, não implementação
8. **Nenhum código sem spec/plano aprovado** (processo SDD)