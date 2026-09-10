# Template de Módulo - Héstia

Use este template ao criar um novo módulo. O objetivo é consistência para que múltiplos agentes possam trabalhar em paralelo.

---

## Estrutura de Pastas

> Gerado por `.agents/scripts/new-module.js <modulo>` (task 43) — este template documenta o que o gerador scaffolda. Camadas proibidas: `services/`, `schemas/`, `use-cases/`, `mappers.ts`, factories (removidas na 41; ver Mapa de Camadas no AGENTS.md).

```
lib/<modulo>/
  repositories/     # Acesso a dados via IDatabaseClient - uma por tabela/entidade
    interfaces.ts   # Contratos I*Repository (DIP)
    fakes/          # Fakes em memória p/ testes e contracts
  hooks/            # React hooks para busca de dados e mutações (ex.: useExamples)
  db/               # Barrels `export *` sobre repositories - caminho oficial da UI (mockável)
  types.ts          # Fonte única: Row/Input/Domain (nunca duplicar)
  utils.ts          # Regras puras (sem I/O)
  index.ts          # Barrel: types + repositories + db + hooks + utils

components/<modulo>/
  *.tsx             # Componentes React (Client Components)
  *.stories.tsx     # Stories Storybook (obrigatórias p/ componentes novos)
  ui/               # Componentes de UI específicos do módulo (opcional)

app/<modulo>/
  page.tsx          # Server Component (ou Client se precisar de interação)
  layout.tsx        # Layout do módulo (opcional)
  */page.tsx        # Sub-páginas

__tests__/lib/<modulo>/
  *.test.ts         # Testes unitários (contracts via fakes, hooks, utils)
  repositories/contract-*.test.ts  # Contratos compartilhados vs fakes (decisão 57: fakes-only, sem impl Supabase prometida)

__tests__/components/<modulo>/
  *.test.tsx        # Testes de componentes

__tests__/app/<modulo>/
  *.test.tsx        # Testes de integração de página
```

---

## Convenções de Código

### Repositories (`lib/<modulo>/repositories/`)
- Uma função por operação: `getX`, `createX`, `updateX`, `deleteX`
- Recebem `db: IDatabaseClient` (de `@/lib/shared/database`) como primeiro parâmetro — nunca `SupabaseClient`
- Contêm as regras de persistência (ex.: período aberto) além do CRUD
- Lançam erro nativo (não encapsulam)
- Retornam tipos definidos em `types.ts`
- Interfaces `I*Repository` + `fakes/` em memória + contracts (`__tests__/lib/<modulo>/repositories/contract-*.test.ts`)
- **Nunca importam `@supabase/*`** — só `lib/shared/` conhece o Supabase

```ts
// repositories/transactions.ts
export async function getTransactionsByMonth(
  db: IDatabaseClient,
  year: number,
  month: number
): Promise<TransactionWithDetails[]> { ... }
```

### Services (`lib/<modulo>/services/`)
- **NÃO EXISTE (removido na 52; proibido recriar)**: a camada de standalones do Pluto foi migrada para `db/*` e deletada. Módulo novo acessa dados via `db/*` direto dos hooks.
- Validação de input vive nos forms/modais (boundary real), não em camada intermediária

### Hooks (`lib/<modulo>/hooks/`)
- Um hook por entidade principal; fetch via `db/*` com promise-chain + flag `cancelled` (nunca set-state após unmount)
- Encapsulam `useState`, `useEffect`, `fetchData`, `loading`, `error`
- Retornam `{ data, loading, error, refetch }`
- Pages ficam limpas: apenas renderização

```ts
// hooks/useExamples.ts
export function useExamples() {
  const [data, setData] = useState<ExampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listExamplesStandalone().then(
      (items) => {
        if (cancelled) return;
        setData(items);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar itens");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  ...
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
export * from "./repositories/example";
export * from "./db/example";
export * from "./hooks/useExamples";
export * from "./utils";
```

---

## Checklist para Novo Módulo

- [ ] Criar `.agents/modules/<modulo>/backlog.md` e adicionar na tabela de módulos do backlog central (`.agents/modules/hestia/backlog.md`)
- [ ] Gerar estrutura via `.agents/scripts/new-module.js` (já scaffolda types, repositories+interfaces+fakes, db, hooks, utils, index, contract, story, testes espelho)
- [ ] Definir `types.ts` primeiro (contrato, fonte única)
- [ ] Implementar `repositories/` (acesso a dados) + `fakes/` + contract em `__tests__/lib/<modulo>/repositories/`
- [ ] Implementar `hooks/` (busca de dados para UI, via `db/*`)
- [ ] Criar componentes em `components/<modulo>/` + `*.stories.*`
- [ ] Criar página em `app/<modulo>/page.tsx` usando hooks (só composição)
- [ ] Escrever testes: contracts, hooks, componentes, página (factories de mock com defaults)
- [ ] Rodar `npm test`, `npm run lint`, `npx tsc --noEmit` e `npm run build-storybook` - tudo deve passar
- [ ] Atualizar `.agents/modules/hestia/backlog.md` com status do módulo

---

## Princípios não-negociáveis

1. **UI (pages/hooks) acessa dados via `db/*`** (barrels sobre repositories) → nunca SQL/Supabase na UI (não existe `services/` — removido na 52)
2. **Repositories** são a única camada que toca dados, sempre via `IDatabaseClient` → nunca `@supabase/*` fora de `lib/shared/`
3. **Regras de persistência** vivem nos repositories; **regras puras** em `utils.ts`/`<dominio>-*.ts`; **validação de input** nos forms/modais (não há `schemas/`)
4. Caminhos completos e proibições: ver **Mapa de Camadas no AGENTS.md** (fonte normativa; este template o resume)
5. **Tipos compartilhados** vivem em `types.ts` e são exportados pelo `index.ts`
6. **Utils compartilhadas** vêm de `@/lib/shared/` (date, currency, utils)
7. **Testes testam comportamento**, não implementação
8. **Nenhum código sem spec/plano aprovado** (processo SDD)