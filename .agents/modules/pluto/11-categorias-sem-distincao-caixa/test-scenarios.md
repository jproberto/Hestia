# Cenários de homologação — 11 Categorias e Contas sem Distinção de Caixa e Acentos

> Derivados exclusivamente de `spec.md` (§5 regras de negócio, §8 cenários de edge case, §6 migração, §10 critérios de aceite). Sem cenários de Atena (não gerada por ela, sem viés).
> **Somente cenários manuais** (decisão 2026-10-16): a cobertura automatizada vive na suíte e no `test-report.json`; este arquivo é o roteiro do portão manual de homologação.
> Textos das features citados entre aspas exatas quando relevantes — sem paráfrase nova.
> Estado da suíte desta entrega: ver `test-report.json` (suíte completa com 0 falhas e cobertura ≥ 80%).

**Pré-requisitos comuns (homologação em produção/staging):**
- Migração `migration-0019-pluto-categorias-contas-normalizadas.sql` **aplicada pelo humano no Supabase** (padrão do módulo — aplicação manual, nunca automatizada), com a linha auditada em `public.schema_migrations` sob o nome idêntico ao do arquivo.
- Banco legado com duplicatas por caixa/acentos para os cenários de fusão: ex.: categorias `Mercaria` e `mercaria` (despesa), `Alimentação` e `alimentacao` (despesa), e contas `Itaú` e `itau` (conta).
- Pelo menos uma categoria `Mercado` (receita) para os cenários de homônima.

---

## Regra 1 — Normalização: caixa, acento, Unicode e nome salvo cru

### Cenário 1: Caixa diferente reutiliza a categoria existente
**Dado** que existe a categoria `Mercaria` (despesa)
**Quando** a pessoa cria um lançamento de despesa com a categoria digitada `mercaria` e salva
**Então** nenhuma linha nova é criada — o salvamento devolve a categoria `Mercaria` existente e o extrato mostra a categoria `Mercaria`

### Cenário 2: Acento e caixa no mesmo nome são a mesma categoria
**Dado** que existe a categoria `Alimentação` (despesa)
**Quando** a pessoa cria uma despesa com `alimentacao` e outra com `ALIMENTAÇÃO`
**Então** ambas são a mesma categoria — a linha gravada permanece com a grafia original `Alimentação` em nenhum dos lançamentos aparece uma categoria nova

### Cenário 3: Texto colado em forma Unicode diferente é o mesmo nome
**Dado** que existe a categoria `Alimentação` (despesa) com o "é" em forma composta
**Quando** a pessoa cola no campo de categoria o mesmo texto com o "é" em forma decomposta (caracteres separados) e salva
**Então** é a mesma categoria — a normalização iguala as duas formas e nenhuma linha nova aparece

### Cenário 4: O nome gravado é sempre o texto cru digitado
**Dado** que não existe nenhuma categoria com esse nome normalizado
**Quando** a pessoa digita um nome novo com caixa mista (ex.: `Transporte Urbano`) e salva
**Então** a categoria é gravada exatamente com o texto digitado — sem filtro de Camel Case, sem reescrita e sem renomeação de nomes já existentes

---

## Regra 2 — Identidade por tipo

### Cenário 5: Nome igual em tipo diferente cria linha própria
**Dado** que existe a categoria `Salário` (receita)
**Quando** a pessoa cria uma despesa com a categoria `salário`
**Então** uma **nova** linha despesa é criada — não se reaproveita a categoria de receita e o formulário oferece a despesa nova ao salvar

---

## Regra 4 — Corrida de criação entre abas

### Cenário 6: Duas abas criando a mesma categoria ao mesmo tempo
**Dado** duas abas abertas no formulário de novo lançamento, ambas digitando `Feira` (despesa) pela primeira vez
**Quando** a pessoa salva quase simultaneamente nas duas abas e o insert de uma delas perde para a trava de duplicata
**Então** a segunda relê, devolve a linha já criada e o salvamento segue normal — nenhuma mensagem de erro aparece para o usuário e só existe uma categoria `Feira`

---

## Regras 6 e 7 — Sugestões alinhadas e homônima no blur

### Cenário 7: Blur do campo de categoria copia a grafia da homônima do outro tipo (lançamento)
**Dado** que existe a categoria `Mercado` (receita) e o campo de categoria de um lançamento de **despesa** está com `mercado` digitado
**Quando** o campo perde o foco (fora do campo)
**Então** ele assume automaticamente a grafia `Mercado` — sem aviso, sem mensagem, sem bloqueio e sem estado novo embaixo do campo

### Cenário 8: Blur no formulário de previsão do orçamento
**Dado** que existe a categoria `Mercado` (receita) e o campo de categoria do formulário de previsão de **despesa** está com `mercado` digitado
**Quando** o campo perde o foco
**Então** o campo assume a grafia `Mercado` da existente, sem nenhum aviso novo; se não houver homônima do outro tipo (ou se a grafia já for a mesma), nada muda

### Cenário 9: Datalist do lançamento mostra a variante e preenche o nome original
**Dado** que existe a categoria `Alimentação` (despesa)
**Quando** a pessoa digita `alimentacao` no campo de categoria do lançamento
**Então** `Alimentação` aparece na lista de sugestões com o valor igual ao nome original — ao escolhê-la o campo recebe `Alimentação`; com o campo vazio a lista completa aparece; nenhum aviso novo é renderizado abaixo do campo

### Cenário 10: Lista de sugestões do orçamento com a mesma regra
**Dado** que existe a categoria `Alimentação` (despesa)
**Quando** a pessoa digita `alimen` no campo de categoria do formulário de previsão
**Então** `Alimentação` aparece entre as sugestões (mesma regra de caixa + acentos) e, quando o texto digitado é exatamente `Alimentação`, o nome é excluída da lista como antes — comportamento de exclusão mantido

---

## Estados: vazio e falha de rede

### Cenário 11: Estado vazio — criação em branco inalterada
**Dado** que não há nenhuma categoria criada (ou o nome digitado não corresponde a nenhuma)
**Quando** a pessoa digita um nome e salva
**Então** a categoria é criada e aparece nas listas de sugestões — comportamento de criação em branco exatamente como estava

### Cenário 12: Falha de rede mantém o tratamento de erro atual
**Dado** uma conexão com a rede interrompida (modo offline simulado) no momento da abertura do formulário
**Quando** a carga inicial de categorias falha
**Então** o formulário mantém o tratamento de erro atual — mensagem visível e o modal de lançamento não fecha em silêncio — sem comportamento novo

---

## Regra 5 — Trava do banco com normalização e homônimas

### Cenário 13: Homônimas dos dois tipos coexistem e cada consulta respeita o tipo
**Dado** que após a migração existem `Mercado` (receita) e `Mercado` (despesa)
**Quando** um lançamento de receita escolhe `Mercado` e um de despesa escolhe `Mercado`
**Então** cada retorno respeita o tipo pedido — a receita aponta para a linha de receita e a despesa para a de despesa, sem ambiguidade na busca

### Cenário 14: Trava de (nome normalizado, tipo) vale nas DUAS tabelas
**Dado** a migração aplicada, com categoria `Mercaria` (despesa) e conta `Itaú` (conta) existentes
**Quando** a pessoa tenta criar outra categoria do mesmo tipo escrita `MERCARIA` e outra conta do mesmo tipo escrita `itau`
**Então** ambas são rejeitadas pela trava do banco (variante no mesmo tipo não vira linha nova); quando a mesma grafia é usada em tipos diferentes — categoria `Freela` em receita e em despesa, conta `Itaú` e cartão `Itaú` — as duas linhas são criadas normalmente

---

## Regra 8/9/10 — Migração 0019 (aplicação manual pelo humano)

> **Aplicação manual pelo humano no Supabase** (padrão do módulo): o script `migration-0019-pluto-categorias-contas-normalizadas.sql` não é executado por automação nenhuma desta entrega.

### Cenário 15: Fusão com três apontadores
**Dado** as categorias `Mercaria` e `mercaria` (despesa) existindo no legado, ambas com lançamentos, itens de orçamento e itens de checklist apontando para elas
**Quando** o humano aplica a migração 0019
**Então** tudo passa a apontar para a vencedora e a perdedora é excluída — nenhum lançamento, item de orçamento ou item de checklist é perdido ou bloqueado pelo DELETE, e os totais das telas não mudam

### Cenário 16: Escolha da sobrevivente (mais usada; empate → mais antiga)
**Dado** um grupo de duplicatas em que uma linha tem 5 apontadores e a outra 3, e outro grupo em que as duas têm a mesma contagem mas datas de criação diferentes
**Quando** a migração roda
**Então** no primeiro grupo sobrevive a de 5 apontadores; no segundo sobrevive a de menor `created_at` (a mais antiga) — em todos os casos a grafia sobrevivente é a da linha vencedora

### Cenário 17: Colisão de unicidade no orçamento — prevalece a sobrevivente
**Dado** vencedora e perdedora com item de orçamento no **mesmo ajuste**
**Quando** a migração reaponta os itens de orçamento
**Então** a linha da sobrevivente permanece com o valor que já tinha e a da perdedora é descartada junto com ela — **não** é somada nem duplicada a previsão do ajuste

### Cenário 18: Rollback — tudo ou nada (inclusive sem a função de acento)
**Dado** o banco em uma cópia de teste, com contagens de `transactions`, `budget_items` e `checklist_items` anotadas antes
**Quando** qualquer etapa da migração falha — inclusive a tentativa de habilitar a função de remover acento, que deve abortar com erro claro antes de qualquer mudança —
**Então** `categories`, `financial_accounts` e todas as tabelas dependentes ficam exatamente como antes, sem linha excluída à metade e sem trava nova a meio caminho; a correção permite re-executar a migração do zero

### Cenário 19: Migração legada e verificações pós-aplicação
**Dado** o banco de produção com duplicatas por caixa/acentos nas duas tabelas e a auditoria de `public.schema_migrations` ainda sem a linha da 0019
**Quando** o humano aplica a migração 0019 e a linha é auditada com o script_name idêntico ao do arquivo
**Então** zero pares do mesmo tipo com (nome normalizado) coincidente permanecem em `categories` e `financial_accounts`; as contagens de lançamentos, itens de orçamento e de checklist ficam inalteradas (exceto as colisões de orçamento do cenário 17), nenhum ponteiro fica órfão, os nomes seguem a grafia da vencedora e nenhuma tela mostra item duplicado em seguida

---

## Regra 11 — Checklist e padrão de contas

### Cenário 20: Formulário do checklist inalterado
**Dado** a migração aplicada com itens de checklist reapontados para a vencedora
**Quando** a pessoa abre o formulário de item do checklist
**Então** o fluxo é idêntico ao anterior — continua apenas **selecionando** categoria existente por id, sem criação por texto e sem mudança de comportamento algum; os itens reapontados continuam listados normalmente

### Cenário 21: Contas e cartões seguem o mesmo padrão de categorias
**Dado** que existe a conta `Itaú` (conta) e a migração aplicada
**Quando** a pessoa cria um lançamento escolhendo a variante `itau` no campo de conta, digita `itaú` numa conta nova do mesmo tipo, e cria uma conta `itaú` com tipo cartão
**Então** a variante do mesmo tipo reutiliza a conta `Itaú` existente (nome gravado é o texto cru quando é linha nova), a homônima em tipo diferente cria linha própria, a trava do banco vale a mesma regra de (nome normalizado, tipo) e o campo de conta permanece como está (select quando há contas, texto livre quando não há — nenhuma lista de sugestão de contas é criada)

---

## Regressão — a feature não quebrou o resto do módulo

### Cenário 22: Regressão dos fluxos existentes do Pluto com a feature ativa
**Dado** o Pluto com a 0019 aplicada e o patch desta feature ativo
**Quando** a pessoa percorre os fluxos habituais: criar/editar/excluir lançamento, orçamento (previsão, edição inline, estouro), checklist de contas a pagar, dashboard, navegação de meses e conciliação
**Então** textos, modais, validações de campo, totais e demais comportamentos permanecem idênticos aos anteriores à feature; as únicas diferenças são a identidade (nome normalizado + tipo), as sugestões alinhadas, a cópia de grafia no blur e a fusão descrita nos cenários acima
