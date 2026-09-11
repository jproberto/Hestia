# Regressão — Pluto

Smokes manuais promovidos de features Pluto (Minos promove a partir de `test-scenarios.md`). Cada cenário ≤3 passos de caminho feliz.

## Acesso - card de Hestia leva ao módulo

1. Acesse `/dashboard` e clique no card do módulo.
2. Confira que o usuário é redirecionado para `/pluto/budget`.

## Retorno - ícone de Home leva de volta para Héstia

1. Em qualquer página do módulo, clique no ícone de casa no topo da tela.
2. Confira que o usuário é redirecionado para `/dashboard`.

## Budget — ajuste vigente pré-selecionado + trava de edição

1. Acesse `/pluto/budget?mockMonth=5` → o ajuste vigente de maio já vem selecionado.
2. Selecione um ajuste anterior → tabela somente-leitura com etiqueta "Histórico (Substituído)", sem "Adicionar Previsão".
3. Volte ao ajuste de maio → edição liberada ("Adicionar Previsão" visível).

## Budget — edição inline salva sem reload

1. No ajuste do mês corrente (`?mockMonth=5`), clique sobre o valor de uma despesa → vira input focado.
2. Digite `1200` + `Enter` (ou clique fora) → exibe `R$ 1200,00` sem recarregar a página.
3. Confira "Despesas Previstas" e "Saldo Planejado" recalculados no topo.

## Budget — zerar oculta categoria do mês em diante

1. No mês aberto, zere o valor de uma categoria (`0` + `Enter`).
2. Categoria some da listagem do mês e o total recalcula.
3. Mude para um mês anterior → categoria segue visível com o valor original (histórico preservado).

## Months — Abrir / Encerrar / Reabrir

1. Em `/pluto/months`, clique em "Abrir" num mês "Não Iniciado" → vira "Aberto" (verde) e o botão vira "Encerrar".
2. Clique em "Encerrar" → vira "Encerrado" e o botão vira "Reabrir".
3. Clique em "Reabrir" → volta a "Aberto".

## Transactions — criar lançamento + estorno

1. Em `/pluto/transactions` (mês aberto), clique em "+ Nova Transação", preencha descrição/valor/conta/categoria e salve → aparece no extrato e "Total Saídas" recalcula.
2. Crie outra como "É um estorno/reembolso?" → ganha a tag "Estorno".
3. Confira o valor abatendo o total de saídas.

## Transactions — editar e excluir lançamento

1. No extrato, clique no Lápis de um lançamento → modal abre preenchido; altere e salve → lista reflete na hora.
2. Clique na Lixeira → confirmação exibe descrição e valor.
3. Confirme → lançamento removido e saldo recalculado.

## Checklist — overflow bloqueia com saída guiada

1. Em `/pluto/transactions` (mês aberto), inclua item global que estoure a categoria → modal "Estouro de Orçamento Detectado" bloqueia e oferece ajustar o orçamento.
2. Confirme o ajuste → item gravado.
3. Com pontuais acima do planejado, confira o banner de orçamento excedido no card.

## Transactions — banner Saldo do Mês

1. Em `/pluto/transactions` (mês aberto), confira o banner "Saldo do Mês" = Receitas − Despesas (verde se ≥ 0).
2. Lance uma despesa que inverta o saldo → banner fica vermelho com o valor negativo.
3. Sem mês aberto, confira a mensagem orientando ir a `/pluto/months`.
