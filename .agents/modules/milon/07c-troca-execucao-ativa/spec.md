# Spec: 07c-troca-execucao-ativa

## Problema Real

Usuário troca treino no **Treino do Dia** (feature 7b — rotação livre), marca série no outro treino → cria **2ª execução aberta** violando o invariante **"1 execução ativa por dono"**.

Contexto: feature #7 (Encerrar treino) já implementa `Finalizar` (selamento via `finished_at` da migração 0011) e `Cancelar` (exclusão da execução aberta). Feature #7b (Rotação Treino do Dia) permite consulta livre entre treinos do programa ativo. O gap: ao trocar de treino e tentar escrever (marcar/editar série), o sistema permite criar nova execução em vez de bloquear. Além disso, **ativar/arquivar programa** com execução aberta do dono em qualquer programa deve ser bloqueado.

---

## Usuários e Cenários

| Usuário | Cenário |
|---------|---------|
| **Casal (2 usuários)** | Cada um abre seu próprio treino na academia; compartilham mesmo modelo Pluto (programa ativo por dono). |
| **Treino do Dia** | Aba principal (`/milon/today`); mostra badge "Em execução" no treino com execução aberta. |
| **Troca manual** | Usuário clica em outro treino do mesmo programa (consulta livre, 7b/D8). |
| **Tentativa de escrita** | Marcar série, editar carga/reps/descanso, abrir modal de edição no treino **sem** execução ativa. |

---

## Jornada (Happy Path + Bloqueio)

1. Execução aberta no **Treino A** → badge "Em execução" visível.
2. Usuário troca para **Treino B** (rotação livre, apenas leitura).
3. Usuário tenta **marcar/editar série no Treino B** → **card disabled** + **tooltip** `"Finalize o Treino A para marcar séries aqui"`.
4. **Nenhuma escrita** em B enquanto A tem execução aberta.
5. Usuário volta ao Treino A → `Finalizar` ou `Cancelar` (já existe #7) → execução fechada.
6. Agora Treino B aceita escrita normalmente.

---

## Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| **R1 — Invariante única** | Máximo **1 execução aberta por dono** (global, independente de programa). Eleva índice de por-treino para por-dono. |
| **R2 — Bloqueio total de escrita** | Qualquer operação de escrita (marcar série, editar carga/reps/descanso, modal de edição) no treino **≠ execução ativa** é bloqueada na UI. |
| **R3 — Leitura livre** | Consulta/visualização de qualquer treino do programa ativo **sempre permitida** (rotação 7b preservada). |
| **R4 — Feedback visual** | Card do treino sem execução ativa: `disabled` + tooltip explicativo. Badge "Em execução" no treino ativo. |
| **R5 — Sem modal de decisão** | Não há confirmação "quer trocar execução?" — guarda simples visual + índice parcial por dono. |
| **R6 — Arquivar Programa** | Se houver execução aberta do dono (em qualquer programa) → bloqueia com aviso: `"Finalize ou cancele a execução ativa antes de arquivar"`. |
| **R7 — Ativar Programa** | Se dono tem execução aberta em qualquer programa → bloqueia ativação com aviso: `"Finalize ou cancele a execução ativa antes de ativar outro programa"`. |
| **R8 — Bloquear sempre remoção de exercício** | Excluir entry de treino com execução aberta do dono sempre bloqueia, com aviso: `"Finalize ou cancele a execução ativa antes de remover exercícios"`. |

---

## Fora de Escopo (YAGNI)

- Push notification / alerta proativo
- Auto-expiração de execução aberta (timeout)
- Sync real-time entre dispositivos
- Relatório de execuções órfãs
- API admin para fechar execução remota
- Migração de dados históricos
- Alteração no schema de `workout_executions` além do índice

---

## Critérios de Aceite

| ID | Critério |
|----|----------|
| **AC1** | Ao tentar marcar série no treino sem execução ativa, botão/ação fica `disabled` e tooltip mostra `"Finalize o Treino A para marcar séries aqui"`. |
| **AC2** | Edição de carga/reps/descanso no treino sem execução ativa: modal não abre / campos disabled + mesmo tooltip. |
| **AC3** | Leitura (visualizar exercícios, séries, histórico) em qualquer treino do programa ativo **sempre funciona**. |
| **AC4** | Badge "Em execução" aparece **apenas** no treino que possui execução aberta. |
| **AC5** | Arquivar programa com execução aberta do dono (qualquer programa) → erro bloqueante com mensagem `"Finalize ou cancele a execução ativa antes de arquivar"`. |
| **AC9** | Ativar programa com execução aberta do dono (qualquer programa) → erro bloqueante com mensagem `"Finalize ou cancele a execução ativa antes de ativar outro programa"`. |
| **AC6** | Após `Finalizar` ou `Cancelar` no treino ativo, outro treino passa a aceitar escrita imediatamente (sem reload). |
| **AC7** | Dois dispositivos: race condition aceita; sem sync real-time; limitação conhecida documentada. |
| **AC8** | App fecha/crash com execução aberta → persiste; resolve via `Cancelar` no Treino do Dia (já existe #7). |
| **AC10** | Excluir entry de treino com execução aberta do dono sempre bloqueia, com mensagem `"Finalize ou cancele a execução ativa antes de remover exercícios"`. |

---

## Riscos e Dependências

| Risco | Mitigação |
|-------|-----------|
| **Race condition multi-dispositivo** | Aceito como limitação conhecida; não há sync real-time; usuário resolve manualmente. |
| **Índice duplicado (Alternativa A)** | Dois índices (por-treino + por-dono) → lógica duplicada; Atena decide no plan. |
| **Migração DDL (Alternativa B/C)** | Drop índice por-treino + create índice por-dono + possível trigger; Atena avalia custo/benefício no plan. |
| **Refatoração consumers** | `useTodayWorkout` e `WorkoutDetailSection` consomem índice atual; Atena mapeia impacto. |

---

## Alternativas Consideradas

| # | Nome | Resumo | Trade-offs |
|---|------|--------|------------|
| **A** | **Mínima/Conservadora** | Mantém ambos índices; `useTodayWorkout` expõe `activeExecutionWorkoutId` via props; bloqueio duplicado na UI. | ✅ Baixo risco, zero breaking change<br>⚠️ Dois índices, lógica duplicada |
| **B** | **Hook Centralizada** | Substitui índice por-treino por índice por-dono; novo hook `useActiveExecution()` single source of truth; seção usa hook interno. | ✅ Índice único, uma fonte de verdade<br>⚠️ Migração DDL + drop, refatoração 2 consumers |
| **C** | **Database-First** | Substitui índice + trigger no banco impede insert/update/archive/activate violando regra por-dono. | ✅ Garantia absoluta<br>⚠️ Trigger acopla regra no DB, difícil testar/versionar |

> **Decisão arquitetural = responsabilidade da Atena no `plan.md`.**

---

## Modelo de Domínio

### Entidades Envolvidas

| Entidade | Campos Relevantes | Notas |
|----------|-------------------|-------|
| `workout_executions` | `id`, `workout_id`, `program_id`, `created_by`, `started_at`, `finished_at` | `finished_at` = selamento (#7); cancelar = exclusão física da linha. Índice atual: único parcial com `finished_at` nulo por `workout_id`. |
| `workouts` | `id`, `program_id`, `name`, `created_by` | Programa ativo → dono = `created_by`. |
| `programs` | `id`, `name`, `created_by`, `status` | Arquivar programa = `status` muda para `inativo`. |

### Índices Atuais (pós #5 + #7)

Existe hoje um índice único parcial por treino, criado na migração 0011, que garante no máximo uma execução aberta por treino, válido somente enquanto a execução está aberta, ou seja com data de encerramento nula.

### Novo Índice Necessário (por dono)

É necessário um índice único parcial sobre a coluna de autoria, que guarda o e-mail do dono em texto, válido somente enquanto a execução está aberta, ou seja com data de encerramento nula, com o objetivo de garantir no máximo uma execução aberta por dono em nível global.

> **Nota:** Índice simples por `created_by` — não requer `program_id` no índice. Substitui o índice por-treino (0011) ou coexiste (Alternativa A). Atena define estratégia no plan.

### Estados de Execução

| Estado | `finished_at` | Ação |
|--------|---------------|------|
| **Aberta** | nulo, sem data de encerramento | Permite marcar/editar séries |
| **Finalizada** | preenchido, com data de encerramento | Somente leitura (histórico) |
| **Cancelada** | linha removida fisicamente | Linha deixa de existir, sem coluna de exclusão |

---

## Premissas Técnicas Validadas

| Premissa | Validação |
|----------|-----------|
| **Arquitetura Olympus** | Camadas: `app/milon/` → `hooks/` → `db/` → `repositories/` → `IDatabaseClient` → Supabase. |
| **Hook `useTodayWorkout`** | Seleciona programa ativo do dono → primeiro treino por criação (feature #4). Expõe `activeExecutionWorkoutId` (nova prop). |
| **Componente `WorkoutDetailSection`** | Slots: `headerActions` (Cancelar #7), `entryFooter` (nulo v1), `footer` (Finalizar #7). Recebe `workoutId` + `activeExecutionWorkoutId` para decidir disabled. |
| **Repository `workoutExecutionsRepository`** | Métodos: `findOpenExecutionByOwner(ownerId)`, `findOpenExecutionByWorkout(workoutId)`, `findOpenExecutionByProgram(programId)`, `findLastSealedExecutionByProgram(programId)`, `create()`, `finishExecution()`, `cancelExecution()`. |
| **DB layer `lib/milon/db/workout-executions.ts`** | Barrel export sobre repository; caminho oficial da UI. |
| **Tipos em `lib/milon/types.ts`** | Fonte única: `WorkoutExecutionRow`, `WorkoutExecutionInput`, `WorkoutExecutionDomain`, `WorkoutExecutionFormData`. |
| **AsyncState** | Componente centralizado para loading/erro/vazio — **proibido reimplementar**. |
| **Migrações** | DDL incremental em `utils/migrations/migration-NNNN-milon-<slug>.sql`; Atena reserva número no plan. |

---

## Cenários de Edge Case

| Cenário | Comportamento Esperado |
|---------|------------------------|
| **EC1 — Arquivar Programa com execução aberta** | Bloqueia com erro: `"Finalize ou cancele a execução ativa antes de arquivar"`. Não permite mudar `status` para `inativo`. Verifica execução aberta do dono em **qualquer programa**. |
| **EC1b — Ativar Programa com execução aberta** | Bloqueia ativação de novo programa se dono tem execução aberta em **qualquer programa**. Erro: `"Finalize ou cancele a execução ativa antes de ativar outro programa"`. |
| **EC2 — App fecha/crash com execução aberta** | Execução persiste aberta (com `finished_at` nulo, sem data de encerramento). Usuário resolve ao reabrir: `Cancelar` no Treino do Dia (já existe #7). |
| **EC3 — Dois dispositivos simultâneos** | Race condition: ambos podem criar execução (índice por-treino permite). Índice por-dono previne no commit; erro de unique constraint → UI trata como "já existe execução ativa". Limitação conhecida, sem sync real-time. |
| **EC4 — Usuário troca dono (impossível)** | Dono é `created_by` do programa, texto com e-mail; imutável. Não há cenário de troca de dono. |
| **EC5 — Programa sem treinos** | Não há execução possível; rotação 7b não mostra treinos; edge case irrelevante. |
| **EC6 — Execução aberta em treino arquivado** | Treino de programa com `status` em `inativo` não aparece na rotação 7b. Execução aberta permanece até `Finalizar`/`Cancelar`. Arquivar programa (EC1) bloqueia. |
| **EC7 — Remoção de exercício com execução aberta** | Excluir entry de treino com execução aberta do dono sempre bloqueia, com erro: `"Finalize ou cancele a execução ativa antes de remover exercícios"`. |

---

## Referências Cruzadas

- **Feature #4** — Treino do Dia v1: `/milon/today` primeira aba, seleção programa ativo → primeiro treino.
- **Feature #5** — Execução de séries: `workout_executions` + índice por-treino (migração 0011).
- **Feature #7** — Encerrar treino: `Finalizar` (footer) + `Cancelar` (headerActions), `finishExecution` UPDATE `finished_at`.
- **Feature #7b** — Rotação Treino do Dia: consulta livre entre treinos do programa ativo (D8).
- **Migração 0011** — `workout_executions` com `finished_at` + índice único parcial por `workout_id`.
- **Migração 0009** — Tabelas `workouts`, `workout_entries`, `workout_series` + `load_unit` e coluna de exclusão lógica em `exercises`.
- **Migração 0010** — Índice único `(workout_id, exercise_id)` (correção D14).

---

## Próximos Passos (Pós-Spec)

1. **Atena** lê `spec.md` + codebase → escreve `plan.md` + `tasks.json` (DAG, criteria testáveis) em `FEATURE_DIR`.
2. **Checkpoint humano**: `PLAN_APPROVED` (`approve-plan`) — **obrigatório** antes de CODING.
3. **Hefesto** implementa (teste RED de Minos → GREEN → refator).
4. **Minos** suíte completa, coverage ≥80%, `test-report.json` + `test-scenarios.md` + promoção `regression.md`.
5. **Argos** review `diff.patch` vs spec/plan → `review-report.json`.
6. **Humano** homologa via `test-scenarios.md` → `approve-review`.
7. **Mnemósine** atualiza docs (`AGENTS.md`, `CHANGELOG.md`, `README.md`).
8. **Caronte** commit em branch `feature/milon/07c-troca-execucao-ativa`, Conventional Commits PT-BR, push.