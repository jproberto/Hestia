# Cenários de Teste — Mílon #5 Execução série a série

> Gerado em 2026-10-10 pós-suite verde (1476 testes, 0 falhas, coverage 85.16%).
> Fonte da verdade: `spec.md` (2ª volta homologada) + `plan.md` (replano + aditamentos) + `tasks.json`.

---

## 1. Execução — abertura e primeira marcação

| ID | Cenário |
|---|---|
| EXEC-01 | **Dado** nenhum treino em execução, **Quando** a pessoa toca curto numa série desmarcada, **Então** abre a execução (início gravado uma vez) e marca a série com retrato dos valores atuais do template. |
| EXEC-02 | **Dado** execução já aberta, **Quando** a pessoa toca curto noutra série desmarcada, **Então** marca a série preservando o início original (abertura idempotente). |
| EXEC-03 | **Dado** execução aberta com várias séries marcadas, **Quando** a pessoa toca curto numa série marcada, **Então** desmarca na hora sem abrir confirmação. |
| EXEC-04 | **Dado** execução aberta com apenas uma série marcada, **Quando** a pessoa toca curto nessa série, **Então** remove a realizada, a série aparece desmarcada e abre a pergunta de cancelamento **sem excluir** a execução. |
| EXEC-05 | **Dado** a pergunta de cancelamento aberta, **Quando** a pessoa confirma, **Então** exclui a execução (início desaparece, zero marcadas, template desbloqueado). |
| EXEC-06 | **Dado** a pergunta de cancelamento aberta, **Quando** a pessoa cancela, **Então** fecha a pergunta mantendo execução aberta, início preservado, zero marcadas, template bloqueado. |

---

## 2. Salvamento no modal de execução (replicação incondicional)

| ID | Cenário |
|---|---|
| SAVE-01 | **Dado** modal de edição aberto em execução, **Quando** a pessoa altera valor/carga e salva, **Então** atualiza a origem no template **e replica** para as séries de posição maior na mesma entry (incluindo já marcadas), sem tocar em feito/execução/retratos. |
| SAVE-02 | **Dado** modal de edição na última série da entry, **Quando** a pessoa salva, **Então** atualiza somente a origem (replicação chamada mas sem seguintes). |
| SAVE-03 | **Dado** série marcada, **Quando** a pessoa edita e salva, **Então** a série permanece marcada. |
| SAVE-04 | **Dado** série desmarcada, **Quando** a pessoa edita e salva, **Então** a série permanece desmarcada. |
| SAVE-05 | **Dado** salvamento com erro, **Então** o modal permanece aberto com mensagem visível (nunca fecha no erro). |

---

## 3. Foto do template removida — template ao vivo

| ID | Cenário |
|---|---|
| LIVE-01 | **Dado** execução aberta com snapshot (estado legado), **Quando** a pessoa visualiza o Treino do Dia, **Então** exibe o template ao vivo (edição aparece na hora), **não** valores congelados. |
| LIVE-02 | **Dado** execução aberta, **Quando** a pessoa edita no Treino do Dia, **Então** reflete no template; a execução segue exibindo o template ao vivo (sem foto). |
| LIVE-03 | **Dado** execução aberta, **Quando** a pessoa edita na manutenção, **Então** reflete no template; a execução segue exibindo o template ao vivo (sem foto). |

---

## 4. Badge "Em execução" + bloqueio do template por treino

| ID | Cenário |
|---|---|
| BADGE-01 | **Dado** execução aberta no Treino do Dia, **Então** exibe badge "Em execução" ao lado do nome do treino. |
| BADGE-02 | **Dado** nenhuma execução aberta, **Então** não exibe o badge. |
| BLOCK-01 | **Dado** manutenção do treino com execução aberta (`executionBlocked=true`), **Então** desabilita o chrome (quantidade, descanso, editar, excluir, reordenar, adicionar) **e** exibe aviso visível "não pode ser editado pois está em execução" (role=alert, sem retry). |
| BLOCK-02 | **Dado** manutenção sem execução aberta, **Então** chrome habilitado e sem aviso. |
| BLOCK-03 | **Dado** execução cancelada (confirmar limpeza), **Então** template desbloqueado automaticamente. |

---

## 5. Unidade herdada no modal de execução (sem escolha)

| ID | Cenário |
|---|---|
| UNIT-01 | **Dado** modal de edição em execução, **Então** exibe a unidade como texto herdado do exercício (prop `loadUnit`), **sem** botões kg/lb e **sem** prop `onChooseUnit`. |
| UNIT-02 | **Dado** exercício com `loadUnit="kg"`, **Então** modal exibe "kg" como texto (rótulo "Carga (kg)"). |
| UNIT-03 | **Dado** exercício com `loadUnit="lb"`, **Então** modal exibe "lb" como texto (rótulo "Carga (lb)"). |
| UNIT-04 | **Dado** card de série em execução, **Então** exibe a unidade como texto herdado, sem botões de unidade. |

---

## 6. Campo único repetição/tempo (modo pertence ao exercício)

| ID | Cenário |
|---|---|
| MODE-01 | **Dado** exercício em modo `repeticao`, **Então** campo único rotulado "Repetições" (tanto no card quanto no modal). |
| MODE-02 | **Dado** exercício em modo `tempo`, **Então** campo único rotulado "Tempo (s)" (tanto no card quanto no modal). |
| MODE-03 | **Dado** exercício sem modo (nulo/legado), **Então** fallback para "Repetições". |
| MODE-05 | **Dado** card/modal em execução, **Então** **não** expõe botão de alternância repetição/tempo. |
| MODE-06 | **Dado** card em manutenção, **Então** **não** expõe botão de alternância repetição/tempo (modo pertence ao exercício). |

---

## 7. Modo e unidade na entry do treino (migração 0012)

| ID | Cenário |
|---|---|
| ENTRY-01 | **Dado** entry criada, **Então** nasce com `mode="repeticao"` e `loadUnit="kg"` (padrões da migração 0012). |
| ENTRY-02 | **Dado** entry pré-migração sem modo/unidade, **Então** leitura trata nulo como `repeticao`/`kg`. |
| ENTRY-03 | **Dado** seletor de Modo no card da entry, **Quando** a pessoa troca, **Então** chama `setEntryMode(entryId, mode)` e recarrega. |
| ENTRY-04 | **Dado** seletor de Unidade no card da entry, **Quando** a pessoa troca, **Então** chama `setEntryLoadUnit(entryId, unit)` e recarrega. |
| ENTRY-05 | **Dado** entry em `tempo` + `lb` e biblioteca sem modo + `kg`, **Então** card/modal exibem "Tempo (s)" e "lb" (fonte = entry, divergência prova a fonte). |

---

## 8. Valor único nas séries (migração 0013)

| ID | Cenário |
|---|---|
| VAL-01 | **Dado** série planejada, **Então** coluna `value` (inteiro ou nulo) substitui `reps`/`duration_seconds`; significado vem do modo da entry. |
| VAL-02 | **Dado** série realizada (retrato), **Então** coluna `value` espelha o template (paridade). |
| VAL-03 | **Dado** commit no card/modal, **Então** persiste `value` (não `reps`/`durationSeconds`). |
| VAL-04 | **Dado** troca de modo da entry, **Então** o número **não muda** (uma só coluna; só o rótulo deriva do modo). |

---

## 9. Unidade abreviada no banco (migração 0014)

| ID | Cenário |
|---|---|
| LB-01 | **Dado** banco com `load_unit` em `exercises` e `workout_entries`, **Então** restrição `CHECK (load_unit IN ('kg','lb'))` nas duas tabelas. |
| LB-02 | **Dado** dados legados com `libra`, **Então** migração converte `libra` → `lb` nas duas tabelas. |
| LB-03 | **Dado** interface, **Então** exibe o valor direto do banco (`kg` ou `lb`), **sem** função de transformação/abreviação. |
| LB-04 | **Dado** conversão secundária, **Então** `kg` ↔ `lb` com fator exato 0.45359237 (1 casa decimal). |
| LB-05 | **Dado** seletor de unidade no card da entry, **Então** opção com valor `lb` e rótulo `lb`. |
| LB-06 | **Dado** mensagem de unidade obrigatória, **Então** cita "kg ou lb" (nunca "libra"). |

---

## 10. Ícones Editar/Excluir no card da entry (padrão biblioteca)

| ID | Cenário |
|---|---|
| ICON-01 | **Dado** card da entry em manutenção, **Então** botões Editar/Excluir são ícones `Pencil`/`Trash2` (h-3.5 w-3.5, lucide-react). |
| ICON-02 | **Dado** botão Editar, **Então** classes de edição (fundo neutro hover, texto normal), rótulo acessível "Editar <nome>", título "Editar exercício". |
| ICON-03 | **Dado** botão Excluir, **Então** classes de exclusão (fundo rosado hover, texto rosa), rótulo acessível "Excluir <nome>", título "Excluir exercício". |
| ICON-04 | **Dado** salvamento em andamento, **Então** ícones desabilitados (preservado). |
| ICON-05 | **Dado** handlers, **Então** `onEditExercise`/`onRemoveEntry` inalterados. |

---

## 11. Texto de cancelamento da execução

| ID | Cenário |
|---|---|
| TXT-01 | **Dado** variante `limpar-execucao` do `WorkoutConfirmModal`, **Então** exibe exatamente: "Todas as séries foram desmarcada. Deseja cancelar a execução desse treino?". |
| TXT-02 | **Dado** confirmar, **Então** chama `confirmClearExecution` (exclui execução, template desbloqueado, início limpo). |
| TXT-03 | **Dado** cancelar, **Então** chama `cancelClearExecution` (só fecha, execução aberta, template bloqueado, início preservado). |

---

## 12. Regressão — manutenção inalterada

| ID | Cenário |
|---|---|
| REG-01 | **Dado** manutenção sem execução, **Então** chrome visível, toggles de unidade kg/lb funcionam, alternância de modo **removida** (modo pertence ao exercício). |
| REG-02 | **Dado** manutenção com programa inativo, **Então** readOnly oculta campos/ações (conteúdo visível). |
| REG-03 | **Dado** `WorkoutDetailSection` sem `executionEnabled`, **Então** comportamento idêntico ao atual (sem hook de execução, sem marcadores, sem modal). |

---

## 13. Contratos de código (busca zerada)

| ID | Critério | Arquivo/escopo |
|---|---|---|
| SUB-01 | `onChooseUnit` => 0 ocorrências | `components/milon/SeriesEditModal.tsx` |
| SUB-02 | `chooseEditorUnit` => 0 ocorrências | `components/milon/WorkoutDetailSection.tsx` |
| SUB-03 | alternância de modo (`alternar para`) => 0 ocorrências | `components/milon/SeriesEditModal.tsx`, `components/milon/SeriesCard.tsx` |
| SUB-04 | `reps` / `durationSeconds` / `duration_seconds` => 0 ocorrências | `lib/milon/**`, `components/milon/**` (exceto testes de migração 0009/0011/0012) |
| SUB-05 | `libra` => 0 ocorrências | `lib/milon/**`, `components/milon/**` (exceto testes de migração 0009/0012/0014 e comentários de conversão) |
| SUB-06 | `abreviarUnidadeCarga` => 0 ocorrências | todo o repo (nunca implementada) |
| SUB-07 | `>Editar<` / `>Excluir<` (botões de texto) => 0 ocorrências | `components/milon/ExerciseEntryCard.tsx` |
| SUB-08 | `confirmLoadUnit` => 0 ocorrências | `lib/milon/hooks/useWorkoutDetail.ts` |
| SUB-09 | `setExerciseLoadUnitStandalone` no caminho do treino => 0 ocorrências | `lib/milon/hooks/useWorkoutDetail.ts`, `lib/milon/db/workouts.ts` |
| SUB-10 | arquivo antigo `migration-0012-milon-exercise-mode.sql` => ausente | `utils/migrations/` |

---

## 14. Cobertura mínima por arquivo (Mílon)

| Arquivo | Stmts | Branches | Funcs | Lines |
|---|---|---|---|---|
| `lib/milon/types.ts` | 0% (apenas tipos) | — | — | — |
| `lib/milon/workout-utils.ts` | 98.9% | 98.41% | 100% | 98.9% |
| `lib/milon/hooks/useWorkoutDetail.ts` | 99.18% | 79.76% | 100% | 99.18% |
| `lib/milon/hooks/useWorkoutExecution.ts` | 96.92% | 70.83% | 100% | 96.92% |
| `lib/milon/hooks/useTodayWorkout.ts` | 79.62% | 61.76% | 100% | 79.62% |
| `lib/milon/repositories/executions.ts` | 67.61% | 54.16% | 53.33% | 67.61% |
| `lib/milon/repositories/workouts.ts` | 33.58% | 66.66% | 27.27% | 33.58% |
| `components/milon/WorkoutDetailSection.tsx` | 77.2% | 76.38% | 68.75% | 77.2% |
| `components/milon/SeriesCard.tsx` | 96.03% | 96.55% | 84.61% | 96.03% |
| `components/milon/SeriesEditModal.tsx` | 99.32% | 92.18% | 100% | 99.32% |
| `components/milon/ExerciseEntryCard.tsx` | 96% | 96.22% | 91.66% | 96% |
| `components/milon/ExerciseModal.tsx` | 100% | 100% | 100% | 100% |

> **Nota:** Cobertura global do projeto 85.16% (≥80% ✓). Módulo Mílon 97.8% statements.