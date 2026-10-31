# Regression — Mílon #3: Treinos e séries planejadas

> Promovido a partir dos testes de contrato, hooks, componentes e páginas que validam comportamento não-regressivo das features #1 e #2.

---

## REG-01 a REG-10: Biblioteca de exercícios (Feature #1)

| ID | Cenário | Origem |
|----|---------|--------|
| REG-01 | Listar exercícios ativos (sem `deleted_at`) | #1 TASK-001/002 |
| REG-02 | Anti-duplicata de nome/músculo só em ativos | #1 TASK-001/002 |
| REG-03 | Criar exercício persiste `load_unit` nulo e `deleted_at` nulo | #3 TASK-002 |
| REG-04 | Editar exercício não toca em `load_unit`/`deleted_at` | #3 TASK-002 |
| REG-05 | Soft delete grava `deleted_at` (não remove linha) | #3 TASK-002 |
| REG-06 | `listExercisesAll` devolve tudo (inclui soft-deletados) | #3 TASK-002 |
| REG-07 | `setExerciseLoadUnit` grava só `load_unit` | #3 TASK-002 |
| REG-08 | FK `workout_entries.exercise_id` ON DELETE RESTRICT impede hard delete | #3 TASK-002 |
| REG-09 | ExerciseModal reutilizado sem mudança de contrato (editar + cadastrar novo) | #3 TASK-014 |
| REG-10 | DeleteExerciseConfirm: comentário "proteção pertence à feature #3" removido (substituído por soft delete) | #3 TASK-002 |

---

## REG-11 a REG-18: Programas (Feature #2)

| ID | Cenário | Origem |
|----|---------|--------|
| REG-11 | Lista de Programas com status, dono, ações | #2 TASK-001/002 |
| REG-12 | Criar/renomear/excluir Programa (rascunho) | #2 TASK-001/002 |
| REG-13 | Ativar/reativar/encerrar Programa | #2 TASK-001/002 |
| REG-14 | Guarda de ativação: `hasWorkoutWithExercise` consultado no momento da ação (não flag fixa) | #3 TASK-010 |
| REG-15 | Excluir Programa rascunho sem treinos: confirmação da #2 mantida | #2 TASK-001/002 |
| REG-16 | Excluir Programa com treinos: bloqueado com `MSG_PROGRAMA_COM_TREINOS` (banner `bloqueio`) | #3 TASK-010 |
| REG-17 | Programa inativo = somente leitura (sem mutações de conteúdo) | #3 TASK-011/012/013/014/015/016 |
| REG-18 | Detalhe do Programa: lista de treinos real (não mais "em breve") | #3 TASK-015/016 |

---

## REG-19 a REG-28: Treinos e exercícios (Feature #3 — núcleo)

| ID | Cenário | Origem |
|----|---------|--------|
| REG-19 | Treino: nome obrigatório + único no Programa (normalizado) | #3 TASK-003/004/012 |
| REG-20 | Sugestão "Treino A…Z, AA, AB…" na primeira posição livre | #3 TASK-003/004/012 |
| REG-21 | Ordem dos treinos = ordem de criação (sem reordenação) | #3 TASK-006/012/016 |
| REG-22 | Excluir treino sem exercícios: direto; com exercícios: bloqueado `MSG_TREINO_COM_EXERCICIOS` | #3 TASK-006/007/008/016 |
| REG-23 | Unicidade de exercício **por treino** (D14): mesmo treino bloqueia; treino diferente do mesmo Programa permite; Programa diferente permite | #3 TASK-005/006/007/008/014 |
| REG-24 | Subtítulo do treino (D15): músculos únicos na ordem de primeira aparição; autoatualiza em adição/remoção/edição de músculo | #3 TASK-004/007/008/012 |
| REG-25 | Drag & drop de exercícios com handle + ghost card + animação; persiste ao recarregar | #3 TASK-013/014 |
| REG-26 | Quantidade de séries: obrigatória (≥1); inválida bloqueia com mensagem; aumentar acrescenta; reduzir com preenchido confirma; sem preenchido direto; zerar remove todas | #3 TASK-003/004/006/013/014 |
| REG-27 | Carga: vazio ≠ 0 (traço); 0 legítimo; negativos recusados; unidade por exercício (primeira digitação); secundária convertida menor/cinza | #3 TASK-004/006/013/014 |
| REG-28 | Descanso: campo único na entrada, vale para todas as séries | #3 TASK-006/013/014 |

---

## REG-29 a REG-35: Séries e operações

| ID | Cenário | Origem |
|----|---------|--------|
| REG-29 | "Aplicar a todas" re-executável: copia reps/tempo/carga da origem; descanso não copiado (já é único); sobrescreve ao reexecutar | #3 TASK-004/006/013/014 |
| REG-30 | Reorder de entradas: valida conjunto de ids, grava position 1..n | #3 TASK-006/008/014 |
| REG-31 | Remoção de entrada: séries primeiro (explícito), depois entrada; FK CASCADE como backstop | #3 TASK-006/008/014 |
| REG-32 | Confirmações: exercício com séries → modal lista perdas; reduzir série preenchida → modal; estrutura vazia → direto | #3 TASK-013/014/015/016 |
| REG-33 | Modais nunca fecham no erro; validação visível; estado preservado | #3 TASK-011/012/013/014/015/016 |
| REG-34 | Estados de tela: `AsyncState` centralizado; retry só em `carga`/ausente; `operacao`/`bloqueio` sem retry | #3 TASK-011–016 |
| REG-35 | Sucesso: lembrete breve 3s padrão do módulo | #3 TASK-007/008/011/012/013/014/015/016 |

---

## REG-36 a REG-41: Integração e normas transversais

| ID | Cenário | Origem |
|----|---------|--------|
| REG-36 | Migração 0009 aplicada com auditoria em `public.schema_migrations` | #3 TASK-002 |
| REG-37 | `npx tsc --noEmit` limpo (zero erros TS) | #3 TASK-002/004/006/008/010/012/014/016 |
| REG-38 | `npm run lint` passa (zero errors) | #3 TASK-002/004/006/008/010/012/014/016 |
| REG-39 | `npm run build-storybook` OK | #3 TASK-012/014/016 |
| REG-40 | `npm run build` OK | #3 TASK-016 |
| REG-41 | Guardian REVIEW OK (Argos approved) | #3 REVIEW |

---

## Rastreabilidade por Task

| Task | REG IDs |
|------|---------|
| TASK-001 | REG-01, REG-02 (atualização RED) |
| TASK-002 | REG-03–REG-10, REG-36, REG-37 |
| TASK-003 | REG-19, REG-20, REG-26 (RED) |
| TASK-004 | REG-19, REG-20, REG-26, REG-27, REG-29, REG-37 |
| TASK-005 | REG-22, REG-23, REG-30, REG-31 (RED) |
| TASK-006 | REG-22, REG-23, REG-26, REG-27, REG-28, REG-29, REG-30, REG-31, REG-37 |
| TASK-007 | REG-23, REG-24, REG-33, REG-35 (RED) |
| TASK-008 | REG-23, REG-24, REG-33, REG-35, REG-37 |
| TASK-009 | REG-14, REG-16 (RED) |
| TASK-010 | REG-14, REG-16, REG-37 |
| TASK-011 | REG-19, REG-20, REG-22, REG-33, REG-34 (RED) |
| TASK-012 | REG-19, REG-20, REG-22, REG-33, REG-34, REG-37, REG-39 |
| TASK-013 | REG-23, REG-25, REG-26, REG-27, REG-28, REG-29, REG-31, REG-32, REG-33, REG-34 (RED) |
| TASK-014 | REG-23, REG-25, REG-26, REG-27, REG-28, REG-29, REG-31, REG-32, REG-33, REG-34, REG-37, REG-39 |
| TASK-015 | REG-18, REG-21, REG-22, REG-24, REG-33, REG-34, REG-35 (RED) |
| TASK-016 | REG-18, REG-21, REG-22, REG-24, REG-33, REG-34, REG-35, REG-37, REG-38, REG-39, REG-40 |
| TASK-017 | REG-41 (suite final + coverage + relatórios) |

---

**Total: 41 REG** — todos cobertos pela suíte 1116/1116 PASS, coverage 85%.