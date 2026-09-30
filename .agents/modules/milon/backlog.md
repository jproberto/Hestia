# Backlog — Módulo Mílon (Academia)

## Contexto do módulo

- **Stack:** Next.js hospedado na Vercel, banco de dados Supabase (mesmo projeto Héstia).
- **Usuários:** 2 (mesmo modelo do Pluto — login individual, mesma família: o casal). Cada Programa tem um dono, mas é visível para os dois — sem permissão restrita. Requisito prático: cada um abre fácil o próprio treino ao chegar na academia.
- **Conceito central — Programa:** conjunto de treinos vigente (ex: A, B, C). Daqui alguns meses o usuário troca de ficha: em vez de editar por cima, arquiva o Programa atual (histórico preservado) e cria um novo grupo com novos treinos/exercícios.
- **Treino:** ficha do dia dentro de um Programa (ex: A = Push). Tem N exercícios; cada exercício tem N séries planejadas, cada série com repetição alvo, carga alvo e tempo de descanso.
- **Execução:** treino realizado no dia. Guarda `iniciado_em` (primeira série marcada) e `encerrado_em` (confirmação de encerramento) para métricas futuras de duração.
- **Exercício:** nasce inline ao montar o treino — seleciona um existente ou cadastra rápido na hora. Campos: nome + músculo + link de vídeo. Ao cadastrar, entra na biblioteca para usos futuros.
- **Fluxo do treino do dia (validado no discovery):** aba "Treino do dia" sabe qual foi o último treino feito e exibe o próximo automaticamente (rotatividade). A página lista exercícios com séries (reps, peso, descanso). Ao terminar uma série, o usuário toca no quadradinho → marca como feita → timer de descanso inicia sozinho. No final, botão "Encerrar treino" com confirmação que avisa se faltam exercícios/séries. Ao confirmar, o treino é registrado.
- **Edição durante o uso:** carga, reps e descanso podem ser ajustados no meio do treino sem sair do fluxo.
- **Fora do backlog por decisão explícita:** RPE (escala 1-10 de esforço) e RIR (reps até a falha) — não entram nem como V2/V3. Séries de aquecimento/extra com marcação própria e observações rápidas por exercício também ficam fora do MVP e de V2 (só reavaliar se dor real aparecer).

Esta ordem reflete **dependência de construção** (o que precisa existir antes), não a ordem de uso no dia a dia.

---

## Backlog priorizado (MVP)

### Bloco 1 — Base: biblioteca, programas e treinos

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 1 | **Biblioteca de exercícios** | Cadastro rápido inline ao montar o treino: seleciona existente ou cria na hora com nome + músculo + link de vídeo. Vira biblioteca reutilizável nos próximos treinos. Sem tela pesada de cadastro separado no MVP. | Concluído | [.agents/modules/milon/01-biblioteca-exercicios/spec.md](.agents/modules/milon/01-biblioteca-exercicios/spec.md) | [.agents/modules/milon/01-biblioteca-exercicios/plan.md](.agents/modules/milon/01-biblioteca-exercicios/plan.md) |
| 2 | **Programas (conjunto A/B/C por dono)** | Agrupa os treinos vigentes de cada usuário (ex: A, B, C). Cada Programa tem um dono mas é visível para os dois. Arquivar preserva histórico; criar novo Programa não apaga o antigo. É o que permite trocar de ficha sem perder o passado. | | | |
| 3 | **Treinos + séries planejadas** | Dentro de um Programa, cada treino tem N exercícios em ordem; cada exercício tem N séries com reps alvo, carga alvo e descanso (segundos). Edição do planejado permitida antes e durante a execução. | | | |

### Bloco 2 — Treino do dia (coração do MVP)

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 4 | **Treino do dia — próximo automático** | Aba "Treino do dia" descobre o último treino executado do Programa ativo do usuário e exibe o próximo da rotação. Funciona com N treinos por Programa, sem o usuário precisar lembrar "hoje é B ou C?". | | | |
| 5 | **Execução série a série + edição no fluxo** | Lista exercícios com séries (reps, peso, descanso). Toque no quadradinho marca a série como feita; carga/reps/descanso editáveis na hora com 1-2 toques (mão suada, celular na mão). Registra `iniciado_em` na primeira marcação. | | | |
| 6 | **Timer de descanso auto + PWA push** | Ao marcar uma série como feita, o timer do descanso daquela série inicia sozinho. Notificação push via PWA avisa o fim mesmo com tela apagada/app em segundo plano. MVP inclui o PWA mínimo para isso funcionar. | | | |
| 7 | **Encerrar treino com confirmação** | Botão "Encerrar treino" com confirmação que lista o que falta (exercícios/séries pendentes). Ao confirmar, registra o treino com `encerrado_em`. Permite encerrar parcial (falta vira dado, não bloqueio). | | | |

### Bloco 3 — Histórico mínimo

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 8 | **Histórico + resumo simples** | Lista de treinos realizados (data, treino, duração calculada de `iniciado_em`→`encerrado_em`, volume total = Σ carga×reps). Sem calendário chique nem gráficos no MVP — só lista + resumo por treino. | | | |

---

## Backlog priorizado (V2)

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 9 | **Evolução por exercício (carga, reps, volume)** | Para cada exercício, ver a progressão de carga, repetições e volume ao longo das execuções. Base para responder "estou progredindo?". | | | |
| 10 | **Calendário de frequência** | Visão mensal/semanal de quais dias treinaram, para acompanhar consistência. | | | |
| 11 | **Medidas corporais + histórico** | Registro de peso e medidas (com campos personalizáveis), com histórico e comparação simples ao longo do tempo. Segunda prioridade após evolução de desempenho. | | | |
| 12 | **Substituição de exercício na hora** | Trocar um exercício durante a execução (ex: máquina ocupada) mantendo o planejado original intacto no histórico. Ficou fora do MVP por YAGNI; reavaliar na V2. | | | |

---

## Backlog priorizado (V3)

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 13 | **Dashboard do módulo** | Estatísticas de frequência/consistência, sequência de treinos (streak), tempo total, volume acumulado e médio. Agrega dados que MVP/V2 já coletam. | | | |
| 14 | **PRs (recordes pessoais)** | Detecção e celebração de recordes por exercício (maior carga, maior volume, mais reps). | | | |
| 15 | **1RM estimado + gráficos de evolução** | Cálculo de 1RM estimado por série/exercício e gráficos de carga/reps/volume/1RM ao longo do tempo. | | | |
| 16 | **Gráficos de evolução corporal** | Curvas de peso/medidas ao longo do tempo a partir dos dados da V2. | | | |

---

## Regra — cenários de teste bloqueados por dependência (pedido humano 2026-09-30)

- **Repassar, não deixar órfão:** cenário de teste que não pode ser executado numa feature porque depende de uma feature futura deve ser **repassado para a feature que o libera** — entra no escopo de teste (`test-scenarios.md`) dessa feature futura, em vez de ser descartado ou adiado sem registro.
- **Exemplo identificado (feature #2 Programas):** os cenários **pós-ativação** (guarda liberada com `hasWorkoutWithExercise = true`) dependem da **feature #3 — Treinos + séries planejadas** e devem ser repassados a ela. Contexto: na #2 a UI nunca passa a flag (`app/milon/programs/page.tsx` chama `usePrograms()` sem opções → default `false`), então toda ativação é bloqueada na tela; o efeito colateral (desativar o programa anterior do mesmo dono) só é exercitado no fluxo de ativação em `__tests__/lib/milon/hooks/usePrograms.test.ts`, bloco "4. Ativação/reativação com hasWorkoutWithExercise = true" — cobertura atual. A regra pura correspondente (`guardaAtivacao`/`aplicarEfeitoColateralAtivacao`) também tem teste direto em `__tests__/lib/milon/program-utils.test.ts`.
- A regra vale para qualquer cenário bloqueado do módulo (incluindo os da home/feature #4 — Treino do dia, quando forem registrados).

---

## Achados de review (Argos) — feature #2 Programas

Registro dos achados minor do review do Argos (decisão humana 2026-09-30: "vão para backlog"). 7 achados: 5 da review do Patch v3 (aprovada) + 2 da review do Patch v4 (aprovada). Textos originais do Argos (os 5 do v3 recuperados do log — o `review-report.json` atual contém apenas os 2 do v4).

| # | Patch | Arquivo:linha | Achado | Encaminhamento |
|---|---|---|---|---|
| 1 | v3 | `lib/milon/program-utils.ts:154` | `transicoesPermitidas('ativo')` retorna `['inativar']`, mas a UI não expõe ação "Inativar" (inativação é efeito colateral automático de ativar outro programa). Sugestão: renomear para `acoesInterfacePorStatus` ou remover `'inativar'` do retorno de `'ativo'`. | backlog (refatoração futura) |
| 2 | v3 | `components/milon/ProgramConfirmModal.tsx:78` | Botão de confirmar usa cores rose-500/rose-600 (destrutivas) para TODAS as ações, incluindo Ativar/Reativar, que não são destrutivas. Sugestão: cor do módulo (#B7602B) para ativar/reativar, rose apenas para excluir. | backlog (ajuste visual) |
| 3 | v3 | `lib/milon/types.ts:70` | Tipos legados `MilonItemRow`, `MilonItem`, `CreateMilonInput` ("Legado do scaffold" da feature #1) permanecem com 0 usos em código vivo. Sugestão: remover. | backlog (limpeza) |
| 4 | v3 | `.agents/modules/milon/02-programas/test-report.json:93` | `npm run build-storybook` não re-executado no Patch v3. | RESOLVIDO no Patch v4: gate re-executado pelo Zeus antes do approve-review (exit 0), registrado no test-report |
| 5 | v3 | `utils/migrations/migration-0008-milon-programs.sql:49` | `executed_by` hardcoded como email fixo em vez de usuário real da execução. Sugestão: usar `CURRENT_USER`/variável de ambiente na execução real; manter placeholder documentado no script. | backlog (aplicar na migração — atenção: migração ainda NÃO aplicada no Supabase) |
| 6 | v4 | `app/milon/programs/page.tsx:198` | Fallback `errorOrigin ?? "carga"` mascara ausência de `errorOrigin` do hook: se o hook falhar em setar a origem, o banner mostraria "Tentar novamente" indevidamente para bloqueio/operação. Sugestão: remover fallback e confiar no hook (já coberto por testes), ou documentar por quê. | backlog |
| 7 | v4 | `__tests__` (página+hook) | Falta teste de integração onde o hook retorna `errorOrigin=null` com `errorMsg` setado, para confirmar o comportamento do fallback. Sugestão: adicionar esse teste. | backlog (candidato a Minos numa próxima feature/rodada) |

**Gaps de teste apontados (testGaps)**

- Ramos defensivos "nunca acontece" (cancelConfirm/confirm lançando, violação de índice único) sem exercício direto — `repositories/programs.ts` 92.98% branch e `usePrograms.ts` 85.86% branch (acima do gate, mas lacuna comportamental).
- CA-P3-11 (histórico do navegador / botão voltar na alternância de abas) não exercitável em jsdom — requer homologação manual (entra na reexecução manual da feature #2).
- Gap "guarda de ativação com conteúdo real": ver regra acima (já registrada na seção anterior — não duplicada).

---

## Fora de Escopo (YAGNI — decisão de discovery 2026-09-12)

- **RPE/RIR:** fora do backlog por decisão explícita do dono — não entra nem como V2/V3.
- **Séries de aquecimento/extra com marcação própria:** fora do MVP e de V2.
- **Observações rápidas por exercício:** fora do MVP e de V2.
- **Permissões restritas por usuário:** não há — Programa tem dono mas é visível para os dois.
- **Integração com apps externos / importação de ficha:** não previsto; cadastro é manual/inline.
