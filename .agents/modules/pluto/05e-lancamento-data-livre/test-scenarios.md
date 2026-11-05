# Cenários de homologação — 05e Lançamento com Data Livre

> Derivados exclusivamente de `spec.md` (§5 regras de negócio, §8 cenários de edge case, §6 migração, §10 critérios de aceite). Sem cenários de Atena (não gerada por ela, sem viés).
> **Somente cenários manuais** (decisão 2026-10-16): a cobertura automatizada vive na suíte e no `test-report.json`; este arquivo é o roteiro do portão manual de homologação.
> Textos das features citados entre aspas exatas quando relevantes — sem paráfrase nova.
> Estado da suíte desta entrega: ver `test-report.json` (suíte completa com 0 falhas e cobertura ≥ 80%).

**Pré-requisitos comuns (homologação em produção/staging):**
- Migração `migration-0018-pluto-lancamento-data-livre.sql` **aplicada pelo humano no Supabase** (padrão do módulo — aplicação manual, nunca automatizada), com a linha auditada em `public.schema_migrations` sob o nome idêntico ao do arquivo.
- Dois meses abertos consecutivos para os principais casos: ex. **Outubro/2026** e **Novembro/2026** (a tela de Novembro é a tela corrente nos exemplos abaixo).
- Pelo menos um item de checklist de contas a pagar com vencimento em data de outro mês (para o cenário de prefill).

---

## Regra 1 — Campo de data livre (rótulo e limites)

### Cenário 1: Modal sem limites de data
**Dado** a tela de Novembro/2026 com o modal de novo lançamento aberto
**Quando** a pessoa observa o campo de data
**Então** o rótulo é exatamente `Data`, o campo não exibe nenhuma mensagem de limitação (nada de "Limitada a") e o calendário aceita selecionar qualquer data — sem restrição visível de mínimo ou máximo

---

## Regra 2 — Abertura do modal no mês da tela

### Cenário 2: Data inicial é o primeiro dia do mês da tela
**Dado** a tela em Novembro/2026
**Quando** a pessoa toca em novo lançamento
**Então** o campo de data vem com 01/11/2026 e o calendário aparece aberto em Novembro/2026

---

## Regras 3 e 5 — Mês de cálculo gravado é o da tela; leitura por mês de cálculo

### Cenário 3: Fatura de mês anterior (tela em Novembro, data em Outubro encerrado)
**Dado** a tela em Novembro/2026 e Outubro/2026 encerrado
**Quando** a pessoa salva uma despesa com data 20/10/2026
**Então** o lançamento é gravado com mês de cálculo Novembro/2026 e aparece no extrato, no saldo e no orçado × realizado de Novembro — sem nenhum erro por Outubro estar encerrado

### Cenário 4: Lançamento não vaza para o mês da data
**Dado** Outubro/2026 também aberto e um lançamento gravado pela tela de Novembro com data 05/10/2026
**Quando** a pessoa abre a tela de Outubro
**Então** aquele lançamento **não** aparece em Outubro nem em nenhum total dele (entradas, saídas, resultado, saldo e orçado × realizado de Outubro permanecem sem ele)

### Cenário 5: Data futura é aceita e soma no mês da tela
**Dado** a tela em Novembro/2026
**Quando** a pessoa salva um lançamento com data 15/03/2027
**Então** o lançamento é gravado e soma em Novembro/2026, com o campo de data sem nenhuma mensagem de restrição

### Cenário 6: Data muito antiga é aceita e soma no mês da tela
**Dado** a tela em Novembro/2026
**Quando** a pessoa salva um lançamento com data de anos anteriores ao plano (ex.: 10/07/2019)
**Então** é aceito normalmente (livre total) e soma em Novembro/2026

### Cenário 7: Ordem do extrato com datas de meses diferentes
**Dado** a tela de Novembro com lançamentos datados de 28/10, 01/11 e 05/11
**Quando** a pessoa abre o extrato
**Então** a tabela exibe 28/10 primeiro, depois 01/11 e 05/11 (data crescente, datas de meses diferentes convivendo na mesma tabela)

---

## Regra 8 — Edição que não move de mês

### Cenário 8: Edição não move o mês de cálculo
**Dado** um lançamento com mês de cálculo Novembro/2026 e data 20/10/2026 exibido na tela de Novembro
**Quando** a pessoa editá-lo e muda a data para 25/10/2026
**Então** o mês de cálculo continua Novembro/2026 e o lançamento permanece na tela de Novembro

### Cenário 9: Correção de tela errada por excluir + relançar
**Dado** um lançamento que deveria ser de Outubro mas foi gravado pela tela de Novembro
**Quando** a pessoa o exclui e abre um novo lançamento na tela de Outubro (com Outubro aberto)
**Então** o novo lançamento nasce com mês de cálculo Outubro/2026 (não existe UI para mover lançamento de mês — a correção é excluir e relançar)

---

## Regra 10 — Salvar e Adicionar Outro

### Cenário 10: Salvar-e-adicionar-outro preserva a data digitada
**Dado** o modal aberto em Novembro com data digitada 20/10/2026 e descrição/valor/categoria preenchidos
**Quando** a pessoa toca em `Salvar e Adicionar Outro`
**Então** o modal permanece aberto com a data ainda em 20/10/2026, descrição/valor/categoria/reembolso limpos e o foco volta ao campo descrição (05d intacto)

---

## Regra 11 — Prefill do checklist

### Cenário 11: Prefill do checklist sem conflito de limites
**Dado** um item do checklist com vencimento em data de outro mês (ex.: vencimento em Outubro com a tela em Novembro)
**Quando** a pessoa gera o lançamento a partir dele
**Então** a data vem pré-preenchida sem nenhum conflito/restrição de limites do campo e o mês de cálculo gravado é o da tela (Novembro/2026)

---

## Regra 4 e 13 — Trava de mês aberto preservada e exclusão

### Cenário 12: Trava de mês fechado usa o mês de cálculo
**Dado** um cenário em que o mês de cálculo do lançamento não está aberto (nenhum mês aberto / backend revalidando)
**Quando** a pessoa tenta salvar (criar, editar ou excluir)
**Então** o sistema rejeita com a mensagem atual de período não aberto, referenciando o **mês de cálculo** (ano/mês gravado), e não a data digitada

### Cenário 13: Exclusão validada pelo mês de cálculo
**Dado** um lançamento na tela de Novembro (mês de cálculo Novembro/2026 aberto)
**Quando** a pessoa exclui o lançamento e confirma
**Então** a exclusão é validada pelo mês de cálculo (Novembro aberto) e o registro é removido da tela

### Cenário 14: Mês encerrado segue inacessível pela UI
**Dado** a tela listando apenas meses abertos (ciclo de vida do mês intacto)
**Quando** a pessoa percorre a navegação de meses
**Então** não existe caminho de UI para lançar em mês encerrado — apenas o mês de cálculo (mês da tela) é usável; encerramento/reabertura de mês permanece como estava

---

## Regra 12 / §6 — Migração e backfill (verificação pós-migração)

> **Aplicação manual pelo humano no Supabase** (padrão do módulo): o script `migration-0018-pluto-lancamento-data-livre.sql` não é executado por automação nenhuma desta entrega.

### Cenário 15: Backfill sem mudança de saldo (verificação pós-migração)
**Dado** o banco com lançamentos existentes e uma cópia dos totais por mês (soma de valores agrupada por ano/mês) capturada **antes** da aplicação
**Quando** o humano aplica a migração 0018 no Supabase (auditoria registrada em `public.schema_migrations` com o nome idêntico ao do arquivo)
**Então** todos os lançamentos existentes recebem mês de cálculo igual ao ano/mês da própria data, a contagem de lançamentos com mês de cálculo nulo é zero e a soma por mês depois da migração é **numericamente idêntica** à de antes (diferença zero — saldos inalterados)

### Cenário 16: Lançamentos pós-migração usam as colunas novas
**Dado** a migração 0018 aplicada e auditada
**Quando** a pessoa cria, edita e exclui lançamentos pelas telas
**Então** criação grava mês de cálculo da tela, edição preserva o mês gravado e a lista do mês lê por mês de cálculo — sem efeito colateral em nenhuma outra tela (dashboard, orçamento, checklist e conciliação permanecem com os mesmos valores para os lançamentos antigos)

---

## Regra 6 — Totais refletem o mês de cálculo

### Cenário 17: Todos os totais da tela seguem o mês de cálculo
**Dado** a tela de Novembro com lançamentos gravados por ela (alguns com datas de Outubro)
**Quando** a pessoa compara extrato, entradas, saídas, resultado, saldo, orçado × realizado e agregação por conta
**Então** todos somam a lista da tela (mês de cálculo Novembro) e **nunca** a data digitada — nenhuma dessas telas exibe lógica ou rótulo novo

---

## Regressão — nada além do calendário mudou

### Cenário 18: Regressão dos fluxos existentes do Pluto com a feature ativa
**Dado** o Pluto com o patch 05e aplicado
**Quando** a pessoa percorre os fluxos habituais: abrir modal pela tela do mês, criar/editar/excluir lançamento, salvar-e-adicionar-outro, checklist de contas a pagar, orçamento, dashboard e navegação de meses
**Então** textos, modais, validações de campo e demais comportamentos permanecem idênticos aos anteriores à feature; a única diferença é a data livre (sem limites, rótulo `Data`) e o mês de cálculo descrito nos cenários acima
