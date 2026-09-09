# Plano de Melhoria Arquitetural - Héstia

**Objetivo**: Preparar a infraestrutura para criação saudável de novos módulos, mantendo comportamentos atuais intocados.

**Princípio**: Mudanças mínimas, alto impacto, zero breaking changes.

---

## Fase 1: Fundação Compartilhada (Semana 1)

### 1.1 Consolidar `lib/shared/`
- [ ] Mover `lib/pluto/utils.ts` → `lib/shared/utils.ts`
- [ ] Criar `lib/shared/date.ts` (formatDateBR, getMonthRange, parseYearMonth, MONTH_NAMES)
- [ ] Criar `lib/shared/currency.ts` (formatCurrency, formatCurrencyOptional)
- [ ] Atualizar imports no módulo Pluto
- [ ] **Testes**: Apenas ajustar paths de import se necessário

### 1.2 Template de Módulo (Documentação)
- [ ] Criar `.agents/module-template.md` com estrutura padrão
- [ ] Definir convenções: `db/`, `services/`, `hooks/`, `types.ts`, `index.ts`

---

## Fase 2: Camada de Hooks (Semana 1-2)

### 2.1 Hooks de Dados para Pluto
- [ ] `lib/pluto/hooks/useTransactions.ts`
- [ ] `lib/pluto/hooks/useBudgets.ts`
- [ ] `lib/pluto/hooks/useChecklist.ts`
- [ ] `lib/pluto/hooks/useAccounts.ts`
- [ ] `lib/pluto/hooks/useCategories.ts`
- [ ] `lib/pluto/hooks/useMonthlyPeriods.ts`
- [ ] Refatorar `app/pluto/transactions/page.tsx` para usar hooks
- [ ] Refatorar `app/pluto/budget/page.tsx` para usar hooks
- [ ] Refatorar `app/pluto/months/page.tsx` para usar hooks
- [ ] **Testes**: Testes de página continuam passando (comportamento idêntico)

---

## Fase 3: Service Layer para Regras de Negócio (Semana 2)

### 3.1 Services do Pluto
- [ ] `lib/pluto/services/transactions.ts` (validação período, getOrCreate account/category)
- [ ] `lib/pluto/services/budget.ts` (ajustes, validações)
- [ ] `lib/pluto/services/checklist.ts` (instanciação global, overflow)
- [ ] Atualizar hooks para chamar services em vez de DB direto
- [ ] **Testes**: Testes unitários de DB permanecem; novos testes para services se houver lógica complexa

---

## Fase 4: Padronização de Módulo (Semana 2-3)

### 4.1 Estrutura Oficial
- [ ] Renomear `lib/pluto/db/` → `lib/pluto/repositories/` (semanticamente correto)
- [ ] Criar `lib/pluto/index.ts` exportando API pública
- [ ] Criar `lib/pluto/types.ts` consolidando tipos
- [ ] Verificar se próximos módulos seguem o padrão

---

## Regras de Execução

1. **Nenhum teste alterado** exceto imports paths
2. **Commits pequenos** - uma tarefa por commit
3. **Validação contínua** - `npm test` e `npm run lint` após cada fase
4. **Parada obrigatória** - aguardar aprovação antes de prosseguir para próxima fase

---

## Status Atual

- [x] Fase 0: Limpeza inicial (utils, modais, checklist-budget) - **CONCLUÍDO**
- [ ] Fase 1: Fundação Compartilhada
- [ ] Fase 2: Hooks
- [ ] Fase 3: Services
- [ ] Fase 4: Padronização