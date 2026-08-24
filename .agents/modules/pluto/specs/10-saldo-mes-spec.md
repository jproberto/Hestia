# Especificação: Saldo do Mês (Item 10 do Backlog)

## 1. Visão Geral e Objetivo

O Item 10 do backlog consiste em exibir o saldo do mês (diferença entre receitas e despesas) em um local prominentemente visível na página de lançamentos do Héstia. Esse valor já é calculado pelos agregadores existentes na página; a presente feature não cria nova lógica de cálculo nem novas consultas ao banco de dados.

**Objetivo:** Apresentar o saldo do mês já calculado de forma visual e clara, para que o usuário tenha immediate acesso ao resultado financeiro do período, independentemente de o mês estar aberto ou encerrado.

## 2. Regras de Negócio

*   **Exibição em Todos os Meses:** O saldo (receitas totais menos despesas totais) será exibido em todos os meses, sejam `aberto` ou `encerrados`. Não há distinção de bloqueio baseado no status do mês.
*   **Uso de Agregadores Existente:** O cálculo da diferença já é feito pelos agregadores de receitas e despesas que existem na página de lançamentos. Não será criado nenhum novo TypeScript, SQL ou função de cálculo.
*   **Formatação BRL:** O valor será sempre formatado em reais usando o locale `pt-BR` (ex: `R$ 1.250,00`).
*   **Indicador Visual:** O saldo receberá um indicador visual baseado no sinal:
    *   Valor positivo: apresentado sem cor adicional ou com indicação sutil de positivo.
    *   Valor negativo: apresentado com indicação de negativo (ex: apresentado entre parênteses ou com sinal de menos realçado).
    *   Valor zero: apresentado como `R$ 0,00`.
*   **Sem Isolamento de Usuário:** O cálculo considera todas as transações lançadas no mês, sem filtro por `created_by`. Isso mantém consistência com o resto da página de lançamentos, que já exibe totais agregados de todas as transações.
*   **Sem Consulta Adicional:** Não são feitas novas requisições ao banco de dados para obter dados do saldo. Apenas exibição do valor já presente na página.

## 3. Critérios de Aceite

*   [ ] Saldo (receitas - despesas) é exibido prominentemente na página de lançamentos
*   [ ] Funciona em meses abertos e fechados (mesmo princípio de exibição)
*   [ ] Formatação em BRL corretamente (R$ X,XX)
*   [ ] Indicador visual de positivo/negativo/zero presente
*   [ ] Não requer novas consultas ao banco/dados - usa valores já existentes na página
*   [ ] Não filtra por usuário - exibe total geral do mês como a página já faz
*   [ ] Não introduz nova lógica de cálculo - reusa agregadores existentes

## 4. Riscos e Fora de Escopo

**Riscos Minimizados:**
*   Não há introdução de novo código de cálculo → não há risco de bugs de nova lógica
*   Não há novas consultas → performance da página não é afetada
*   Mantém consistência com comportamento existente da página

**Fora de Escopo (explicitamente):**
*   Não criar novas funções SQL ou TypeScript de cálculo
*   Não filtrar transações por `created_by` ou isolamento de usuário
*   Não considerar meses anteriores ao corrente
*   Não integrar com bancos externos ou integração bancária
*   Não alterar lógicas existentes de agregação de receitas/despesas
*   Não criar modais, popups ou telas novas - apenas ajuste visual na página de lançamentos

## 5. Alterações no Backlog

Ao final e commitar esta especificação, o status do Item 10 no `.agents/backlog.md` será alterado de `Em Especificação` para `Especificado`, e o arquivo espec será linkado em sua respectiva coluna.

## 6. Especificação de Commit

A especificação será commitada via `node .agents/scripts/sdd.js commit` com mensagem aprovada pelo usuário, seguindo o padrão do projeto. O commit ocorrerá após aprovação explícita deste artefato.