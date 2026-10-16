# Cenários de homologação — 07c Troca com execução ativa

> Derivados exclusivamente de `spec.md` (R1/R2/R6/R7/R8, AC1–AC10, EC1–EC7, jornada 6 passos) + contratos do `plan.md` §3.
> Cobrem AC1–AC10: AC1–AC4 e AC6–AC10 cada um com ≥1 cenário manual executável no Treino do Dia (`/milon/today`); AC5 sem ação manual na UI — ver Nota AC5.
> Textos literais congelados citados entre aspas exatas — sem paráfrase.
> Foco em comportamento observável; sem detalhes voláteis de UI (classe CSS, posição de botão).
> Gerado em 2026-10-15 pós-suite verde (1618 testes, 0 falhas, coverage 84.59% lines / 83.49% branch — ver `test-report.json`).

**Pré-requisito comum (todos os cenários manuais):** programa ativo do dono com pelo menos dois treinos com séries (ex.: **Treino A** e **Treino B**), logado como dono, na aba Treino do Dia (`/milon/today`).

**Textos congelados desta feature (citar literal):**
- Tooltip de escrita: `"Finalize o Treino A para marcar séries aqui"` (padrão com nome real — com outro treino ativo, o nome troca; ex.: `"Finalize o Treino B para marcar séries aqui"`)
- Arquivar: `"Finalize ou cancele a execução ativa antes de arquivar"`
- Ativar: `"Finalize ou cancele a execução ativa antes de ativar outro programa"`
- Remover exercícios: `"Finalize ou cancele a execução ativa antes de remover exercícios"`
- Marcador visual: `"Em execução"`

---

### Cenário 1: Marcar série no treino sem execução — bloqueado com tooltip (AC1, R2, jornada passos 1–4)
**Dado** execução aberta no Treino A (badge "Em execução" visível) e Treino B exibido após troca manual
**Quando** a pessoa tenta marcar uma série no Treino B (toque curto no card)
**Então** nada é marcado, nenhuma escrita parte para o banco e o card exibe o tooltip exatamente `"Finalize o Treino A para marcar séries aqui"`

### Cenário 2: Editar carga/reps/descanso no treino sem execução — modal não abre (AC2, R2)
**Dado** execução aberta no Treino A e Treino B exibido
**Quando** a pessoa tenta editar carga/reps/descanso de uma série do Treino B (toque longo / abrir editor)
**Então** o editor não abre (ou abre com campos desabilitados) e o mesmo tooltip `"Finalize o Treino A para marcar séries aqui"` é exibido

### Cenário 3: Leitura livre em qualquer treino do programa ativo (AC3, R3, jornada passo 2)
**Dado** execução aberta no Treino A
**Quando** a pessoa troca para o Treino B pelo seletor de treinos e navega por exercícios, séries e histórico
**Então** a troca nunca é bloqueada e toda a leitura (exercícios, séries, valores, histórico) funciona normalmente — só a escrita é bloqueada

### Cenário 4: Badge e marcador só no treino ativo (AC4, R4)
**Dado** execução aberta no Treino A, com Treino B no mesmo programa
**Quando** a pessoa visualiza o Treino A, o Treino B e o seletor de treinos
**Então** o badge `"Em execução"` aparece apenas no Treino A (nunca no B) e a opção do Treino A no seletor carrega o sufixo de em execução

> **Nota AC5 (R6 — sem cenário manual):** arquivar programa não tem botão/ação na UI (decisão humana 2026-10-15) — coberto pelo caminho R7 + teste de contrato do repositório.

### Cenário 5: Ativar outro programa com execução aberta — bloqueado (AC9, R7, EC1b)
**Dado** execução aberta do dono em qualquer programa (aberta no Treino A do programa ativo)
**Quando** a pessoa tenta ativar outro programa
**Então** a ativação é bloqueada com erro exatamente `"Finalize ou cancele a execução ativa antes de ativar outro programa"`, o programa ativo permanece o mesmo e o modal (se houver) não fecha no erro

### Cenário 6: Remover exercício com execução aberta — sempre bloqueado (AC10, R8, EC7)
**Dado** execução aberta do dono (aberta no Treino A)
**Quando** a pessoa tenta excluir um exercício (entry) de qualquer treino
**Então** a exclusão é bloqueada com erro exatamente `"Finalize ou cancele a execução ativa antes de remover exercícios"` e nenhuma exclusão parte para o banco

### Cenário 7: Finalizar ou Cancelar libera o outro treino sem reload (AC6, jornada passos 5–6)
**Dado** execução aberta no Treino A com Treino B bloqueado para escrita
**Quando** a pessoa volta ao Treino A e aciona `Finalizar` (sela) ou `Cancelar` (exclui a aberta, feature #7) e em seguida tenta escrever no Treino B sem recarregar a página
**Então** o Treino B passa a aceitar escrita imediatamente (marcar/editar séries funciona)

### Cenário 8: Dois dispositivos simultâneos — limitação conhecida (AC7, EC3)
**Dado** dois dispositivos logados como o mesmo dono tentando abrir execução em treinos distintos ao mesmo tempo
**Quando** ambas as tentativas partem sem sincronização em tempo real
**Então** vale a regra documentada: sem sync real-time — apenas uma persiste (índice único por dono); a perdedora recebe erro tratado e o usuário resolve manualmente (sem cenário de corrida determinístico para homologação manual — cobertura automatizada no contrato por dono)

### Cenário 9: App fecha com execução aberta — persiste e resolve via Cancelar (AC8, EC2)
**Dado** execução aberta no Treino A com o app fechado/crashado
**Quando** a pessoa reabre o app e volta ao Treino do Dia
**Então** a execução segue aberta (badge `"Em execução"` intacto) e o usuário resolve pelo fluxo existente da feature #7 (`Cancelar` no Treino do Dia)

---

## Edge cases (spec § Edge Case, sem cenário novo quando irrelevante manualmente)

### Cenário 10: EC4 — troca de dono (impossível, sem ação manual)
**Dado** dono como `created_by` (e-mail, imutável)
**Quando** a pessoa usa o app normalmente
**Então** não há troca de dono a homologar — sem ação manual

### Cenário 11: EC5 — programa sem treinos (sem execução possível)
**Dado** programa ativo sem treinos
**Quando** a pessoa abre o Treino do Dia
**Então** não há treino para bloquear/liberar — edge irrelevante, sem homologação

### Cenário 12: EC6 — execução aberta e programa arquivado (arquivar bloqueado — ver Nota AC5)
**Dado** tentativa de arquivar programa com execução aberta
**Quando** a pessoa tenta o arquivamento
**Então** vale o bloqueio da Nota AC5 — a aberta permanece até `Finalizar`/`Cancelar`; treino de programa inativo segue somente leitura (regra vigente)

---

## Travas das features anteriores verificadas (sem regressão)

- Seleção e rotação do Treino do Dia inalteradas (REG-47/REG-58): aberta do programa ativo vence a rotação; sem aberta, próximo por último selado.
- `Finalizar`/`Cancelar` da feature #7 intactos (REG-57): posições, textos e selamento via `finished_at`.
- Template na manutenção segue bloqueado durante aberta e livre pós-selo/cancelamento (REG-51).
- Leitura via switcher nunca bloqueia (R3); nenhum modal de decisão foi introduzido (R5).
