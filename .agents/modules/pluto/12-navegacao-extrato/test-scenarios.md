# Cenários de homologação — 12 Navegação e Extrato de Pluto

> Derivados exclusivamente de `spec.md` (§5 regras de negócio, §6 cenários de edge case, §12 critérios de aceite) + `tasks.json` (T6). Sem cenários de Atena (não gerada por ela, sem viés).
> **Somente cenários manuais** (decisão 2026-10-16): a cobertura automatizada vive na suíte e no `test-report.json`; este arquivo é o roteiro do portão manual de homologação.
> Textos da spec citados entre aspas exatas quando relevantes — sem paráfrase nova.
> Estado da suíte desta entrega: ver `test-report.json` (suíte completa com 0 falhas e cobertura ≥ 80%).

**Pré-requisitos comuns (homologação em produção/staging):**
- Usuário logado no Héstia, módulo Pluto, com um mês aberto.
- Para os cenários de partição: contas e cartões com nomes alfabeticamente intercalados — ex.: `Itaú` (conta), `Nubank` (cartão), `Sicredi` (conta), `Uber` (cartão).
- Para os cenários de homônimos (12 e 13): `Itaú` (conta) **e** `Itaú` (cartão) cadastradas — duas linhas válidas, permitidas pela identidade (nome normalizado, tipo).
- Para o cenário do placeholder (14): ao menos um lançamento sem conta correspondente.
- Os cenários 1 a 3 podem ser verificados em qualquer uma das três abas do módulo.

---

## Item 12 — Navegação (Lançamentos primeiro)

### Cenário 1: Ordem da navegação em qualquer página
**Dado** que o usuário está em qualquer página do módulo Pluto (Lançamentos, Orçamento Anual ou Meses e Períodos)
**Quando** ele observa a barra de navegação do módulo
**Então** os links aparecem exatamente nesta ordem: "Lançamentos", "Orçamento Anual", "Meses e Períodos" — mesmos rótulos e mesmos endereços de sempre; apenas a posição de Lançamentos mudou

### Cenário 2: Aba ativa por deep link (Orçamento Anual)
**Dado** acesso direto ao endereço `/pluto/budget` (digitado na barra do navegador, sem clicar em nenhum link antes)
**Quando** a página carrega
**Então** "Orçamento Anual" é o único link com marcação de aba ativa (`aria-current="page"`) e destaque visual, independentemente de ser a segunda posição da nav

### Cenário 3: Aba ativa por deep link (Meses e Períodos)
**Dado** acesso direto ao endereço `/pluto/months` sem histórico de clique
**Quando** a página carrega
**Então** "Meses e Períodos" é a única aba ativa e destacada — nenhuma outra aba aparece marcada

---

## Item 16 — Ordenação do extrato (desempate por inclusão)

### Cenário 4: Empate de data — ordem de inclusão
**Dado** uma conta com dois lançamentos na mesma data, em que o segundo foi incluído depois (hora de criação mais recente) e possui identificador maior que o primeiro
**Quando** o extrato renderiza
**Então** o lançamento incluído primeiro aparece antes — a ordem em que foram digitados prevalece, mesmo com o identificador maior

### Cenário 5: Data continua sendo o critério principal
**Dado** uma conta com um lançamento de 10/03 incluído depois e outro de 15/03 incluído antes
**Quando** o extrato renderiza
**Então** 10/03 aparece antes de 15/03 — a data vence sobre a ordem de inclusão; a inclusão só desempata datas iguais

### Cenário 6: Registro sem marca de inclusão não quebra a tela
**Dado** um lançamento legado cujo registro não traz a data/hora de inclusão
**Quando** o extrato renderiza
**Então** nenhum erro aparece, a tela carrega normalmente e o lançamento é exibido na posição determinada pela data

### Cenário 7: Empate também na marca de inclusão preserva a ordem de entrada
**Dado** dois lançamentos com mesma data e mesma data/hora de inclusão
**Quando** o extrato renderiza
**Então** a ordem em que foram lançados é preservada, sem salto para uma ordem arbitrária por identificador

### Cenário 8: Editar lançamento não altera sua posição de inclusão
**Dado** um lançamento incluído depois que exibe após outro de mesma data, e a pessoa o edita (valor ou descrição)
**Quando** a lista é reexibida
**Então** a data/hora de inclusão permanece a original e a posição de desempate entre iguais não muda

---

## Item 17 + 2º amend — Contas antes dos cartões, homônimos e roteamento por conta

### Cenário 9: Mistura completa contas × cartões
**Dado** um extrato com `Itaú` (conta), `Nubank` (cartão), `Sicredi` (conta) e `Uber` (cartão) — nomes alfabeticamente intercalados
**Quando** o extrato renderiza
**Então** a ordem exibida é: `Itaú` e `Sicredi` (as contas primeiro), depois `Nubank` e `Uber` (os cartões)

### Cenário 10: Só cartões preserva a ordem atual
**Dado** que somente cartões estão cadastrados
**Quando** o extrato renderiza
**Então** os blocos aparecem na mesma ordem de sempre — nenhuma mudança perceptível

### Cenário 11: Só contas preserva a ordem atual
**Dado** que somente contas estão cadastradas
**Quando** o extrato renderiza
**Então** os blocos aparecem na mesma ordem de sempre — nenhuma mudança perceptível

### Cenário 12: Homônimos em dois blocos distintos (spec cenário 13)
**Dado** `Itaú` (conta) e `Itaú` (cartão) cadastradas — duas linhas válidas, permitidas pela identidade (nome normalizado, tipo)
**Quando** o extrato renderiza
**Então** existem DOIS blocos distintos ambos intitulados "Itaú", cada um com seu próprio selo de tipo — o da conta antes do do cartão —, sem colapso em bloco único e sem misturar lançamentos de conta com fatura

### Cenário 13: Cada lançamento no bloco da sua conta (spec cenário 26)
**Dado** `Itaú` (conta) com um lançamento L1 e `Itaú` (cartão) com um lançamento L2 — ambos registrados com o nome de conta "Itaú"
**Quando** o extrato renderiza
**Então** L1 aparece somente no bloco da conta Itaú e L2 somente no bloco do cartão Itaú; nenhum dos dois é exibido no bloco homônimo errado — a distribuição é pelo vínculo da conta, não pelo nome

### Cenário 14: Bloco "Sem Conta" fica no grupo das contas
**Dado** um lançamento sem conta correspondente
**Quando** o extrato renderiza
**Então** ele aparece num bloco "Sem Conta" com selo de conta, antes de qualquer cartão — nunca entre os cartões

### Cenário 15: Bloco sem lançamentos continua aparecendo
**Dado** um cartão cadastrado sem nenhum lançamento no mês
**Quando** o extrato renderiza
**Então** ele continua aparecendo com o aviso "Nenhum lançamento nesta conta no mês de ...", posicionado após todas as contas

---

## Item 18 — Extrato em coluna única

### Cenário 16: Desktop — um bloco abaixo do outro
**Dado** o extrato com vários blocos numa tela larga (a partir do breakpoint `md`)
**Quando** a página renderiza
**Então** cada bloco ocupa a largura total, um abaixo do outro — nenhuma linha com dois blocos lado a lado

### Cenário 17: Mobile — uma coluna sem regressão
**Dado** o extrato numa tela estreita
**Quando** a página renderiza
**Então** o comportamento de uma coluna permanece idêntico ao de sempre

### Cenário 18: Conteúdo do bloco permanece inalterado
**Dado** um bloco renderizado em coluna única
**Quando** a pessoa inspeciona o bloco
**Então** cabeçalho (ícone, nome, selo de tipo, total), tabela (Data, Descrição, Categoria, Valor, Ações), botões de editar/excluir e rodapé "+ Nova Transação" continuam funcionais e visualmente inalterados

### Cenário 19: Orçado vs. Real continua em 2 colunas
**Dado** a seção Orçado vs. Real (Receitas/Despesas) acima do extrato
**Quando** a página renderiza em tela larga
**Então** Receitas e Despesas continuam lado a lado em duas colunas — o painel não foi afetado pela mudança do extrato

---

## Estados da tela (transversais)

### Cenário 20: Estado vazio com CTA
**Dado** uma conta sem nenhuma conta ou cartão cadastrado
**Quando** a página de Lançamentos carrega
**Então** o CTA "+ Cadastrar Primeira Conta ou Cartão" aparece como hoje, sem mudança

### Cenário 21: Carregando e erro permanecem idênticos
**Dado** a página de Lançamentos no meio da carga ou com a rede interrompida (modo offline simulado)
**Quando** os dados são buscados
**Então** durante a carga aparece "Carregando contas e lançamentos..." e, na falha, o banner de erro — ambos exatamente como antes da feature

---

## Adição 1 — Ponto neutro `/pluto` + card da home

### Cenário 22: Redirect da raiz `/pluto` (spec cenário 22)
**Dado** acesso ao endereço `/pluto`
**Quando** a página carrega
**Então** o usuário é redirecionado para `/pluto/transactions` e "Lançamentos" fica como aba ativa — a raiz não exibe conteúdo próprio

### Cenário 23: Card da home aponta para `/pluto` (spec cenário 23)
**Dado** o painel de ferramentas (dashboard) renderizado
**Quando** a pessoa aciona o card de Pluto
**Então** a navegação segue para `/pluto` (mesmo padrão do card de Mílon, que vai para `/milon`) — não mais direto para `/pluto/budget`

### Cenário 24: Deep links preservados (spec cenário 24)
**Dado** acesso direto a `/pluto/budget` ou a `/pluto/months`
**Quando** a página carrega
**Então** as páginas abrem normalmente com a aba correspondente ativa — nenhuma rota existente passou a redirecionar

---

## Adição 2 — Norma documental (fase 7 — Mnemósine)

### Cenário 25: Orientação de criação de módulos atualizada (spec cenário 25)
**Dado** que a fase de documentação desta feature foi executada pela Mnemósine
**Quando** a pessoa revisa a orientação de criação de módulos em `AGENTS.md` e/ou `.agents/module-template.md`
**Então** ela registra a norma "raiz do módulo + redirect para a aba padrão (primeira aba da nav)" como orientação oficial de criação de módulos, com texto definido pela Mnemósine

---

## Regressão — a feature não quebrou o resto do módulo

### Cenário 26: Regressão dos fluxos existentes do Pluto com a feature ativa
**Dado** o Pluto com o patch desta feature ativo
**Quando** a pessoa percorre os fluxos habituais: criar/editar/excluir lançamento, orçamento (previsão, edição inline, estouro), checklist de contas a pagar, gestão de meses, saldo e o card da home
**Então** textos, modais, validações de campo, totais e demais comportamentos permanecem idênticos aos anteriores à feature; as únicas diferenças são a ordem da navegação, o redirect da raiz, o destino do card da home e a leitura do extrato descritas nos cenários acima
