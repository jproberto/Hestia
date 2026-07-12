---
name: sdd-writer-agents
description: Use para criar ou atualizar o arquivo AGENTS.md do projeto (padrão aberto para instruções voltadas a agentes de IA), evitando que os agentes precisem reler o projeto inteiro antes de começar a trabalhar. Utilitário sob demanda, não sequencial — chame no início de um projeto sem AGENTS.md ainda, antes de sdd-01-brainstorm quando não houver um, ou depois de sdd-03-implement/sdd-04-review quando mudanças relevantes tiverem sido feitas. Não usar para documentação voltada a humanos (README, CHANGELOG) nem para registrar detalhes de uma tarefa específica — isso pertence ao plano ou ao spec.
---

# Mantendo o AGENTS.md do Projeto

## Visão Geral

Crie ou atualize `AGENTS.md` na raiz do projeto: o padrão aberto ("README para agentes") adotado por OpenAI, Google, Cursor, Factory e outros, reconhecido nativamente por múltiplas ferramentas de agente além de nós. Manter esse arquivo evita que qualquer agente — nesta skill ou em outra ferramenta — precise explorar o repositório inteiro do zero a cada tarefa.

**Anuncie no início:** "Estou usando a skill sdd-writer-agents para atualizar o AGENTS.md do projeto."

**Onde fica o arquivo:** `AGENTS.md` na raiz do repositório. Em monorepos com convenções muito diferentes por pacote, é aceitável um `AGENTS.md` adicional dentro de cada pacote/subdiretório (extensão comum do padrão) — mas só crie um adicional se o parceiro humano confirmar que os pacotes realmente divergem o suficiente para justificar. Se o arquivo não existir, este é um Modo Criação. Se existir, este é um Modo Atualização.

**O princípio central:** este arquivo só compensa se for mais rápido de ler do que o projeto. O padrão AGENTS.md não exige nenhuma seção fixa — a tentação de preencher todas as categorias possíveis "porque a spec sugere" produz ruído. Prefira poucas frases de alto sinal, e apenas o que não é óbvio olhando o código diretamente.

**Nota de cautela:** pesquisa recente (Gloaguen et al., 2026) mostrou que arquivos de contexto gerados por LLM tendem a reduzir a performance do agente e inflar custo — o agente segue fielmente instruções geradas, o que amplia a exploração e o raciocínio sem melhorar o resultado. A defesa contra isso está nos passos abaixo: nunca documentar convenção que não foi observada no código, e nunca reescrever o arquivo inteiro quando só uma parte mudou.

## O Processo

### Passo 1: Determinar o Modo

1. Verifique se `AGENTS.md` existe na raiz do projeto.
2. Não existe → **Modo Criação** (Passo 2A).
3. Existe → **Modo Atualização** (Passo 2B).

### Passo 2A: Modo Criação

1. Explore o projeto de forma dirigida, não exaustiva:
    - Arquivo de manifesto (`package.json`, `pyproject.toml`, `go.mod`, etc.) para stack, dependências principais e scripts.
    - Estrutura de diretórios de alto nível (2-3 níveis, não a árvore completa).
    - `README` e qualquer doc de arquitetura já existente.
    - Configuração de testes, lint e build.
    - Pontos de entrada principais (main, app, index, servidor).
2. Escreva o arquivo seguindo a estrutura do Passo 3, incluindo só as seções que fazem sentido para este projeto.
3. Para cada afirmação que envolva uma decisão ou convenção (não um fato óbvio de arquivo), confirme que ela é observável em pelo menos um lugar do código — não invente convenções que você só supõe que existem.
4. Se algo relevante for ambíguo ou não estiver claro na exploração (ex: duas convenções conflitantes coexistindo), pergunte ao parceiro humano em vez de adivinhar qual documentar.

### Passo 2B: Modo Atualização

1. Leia o `AGENTS.md` atual, completo.
2. Descubra o que mudou desde a última atualização:
    - Se o arquivo tiver um comentário ou seção com data/commit de referência, use `git log --oneline <ref-ou-data>..HEAD` para listar mudanças desde então.
    - Sem essa referência, peça ao parceiro humano o que motivou a atualização (nova feature, refactor, mudança de convenção) em vez de escanear o projeto inteiro de novo — isso anula o propósito da skill.
3. Atualize **apenas** as seções afetadas pelas mudanças identificadas. Não reescreva seções que continuam corretas.
4. Se uma mudança tornar uma frase existente desatualizada ou contraditória, corrija-a — não acumule informação velha ao lado da nova.
5. Atualize (ou adicione, se ainda não existir) um marcador de última atualização com data e commit curto, para viabilizar a próxima atualização incremental.

### Passo 3: Estrutura do Arquivo

O padrão AGENTS.md não exige seções fixas — é markdown livre. Estas são as categorias mais reconhecidas pela comunidade; use como ponto de partida e omita o que não se aplica. Cada seção deve ser curta — listas ou parágrafos de poucas linhas, não prosa longa:

```markdown
# AGENTS.md

<!-- Última atualização: YYYY-MM-DD (commit <hash-curto>) -->

## Visão Geral do Projeto
O que o projeto faz, em 2-3 frases. Não a lista de features — o propósito.

## Ambiente de Desenvolvimento
Como configurar o ambiente localmente: dependências, variáveis de
ambiente necessárias, serviços externos que precisam estar rodando.

## Comandos de Build e Teste
Como rodar testes, lint, build e o servidor local. Comandos exatos,
não descrições vagas. Aponte para `sdd-03-implement/references/testing.md` se essa
skill já existir, em vez de duplicar.

## Estrutura
Diretórios principais e o que cada um contém, só o suficiente para
navegar sem precisar listar tudo. Ex:
- `src/api/` — rotas HTTP, um arquivo por recurso
- `src/core/` — lógica de negócio, sem dependência de framework

## Estilo de Código e Convenções
Padrões que não são óbvios olhando um único arquivo: nomenclatura,
onde colocar testes, como tratar erros, padrões de commit, etc.
S� o que um agente erraria por não saber.

## Diretrizes de Contribuição
Convenções de PR/commit, branch, revisão — se o projeto tiver algo
além do óbvio (ex: "sempre rebase, nunca merge commit").

## Considerações de Segurança
Segredos, dados sensíveis, padrões que não podem vazar em logs ou
prompts — só se houver algo específico deste projeto a observar.

## Decisões Arquiteturais
Escolhas não óbvias e o porquê, quando relevante para não serem
revertidas por engano (ex: "usamos polling em vez de websocket porque X").

## Pendências e Ressalvas
Dívida técnica conhecida, partes do código em transição, áreas
frágeis que merecem cuidado extra.
```

## O Que Incluir (e o Que Não)

**Inclua:**
- Informação que evita releitura repetida do projeto inteiro.
- Convenções e decisões que não são óbvias a partir de um único arquivo.
- Qualquer coisa que, se ignorada, levaria um agente a quebrar um padrão existente.
- Comandos exatos e executáveis, não descrições genéricas ("rode os testes").

**Não inclua:**
- Conteúdo que já está claro e acessível abrindo um arquivo (ex: assinatura exata de uma função — isso o agente lê na hora).
- Histórico de decisões já revertidas ou obsoletas.
- Detalhes de uma tarefa específica em andamento — isso pertence ao plano (`sdd-02-plan`) ou ao spec (`sdd-01-brainstorm`), não ao AGENTS.md.
- Qualquer coisa que você não conseguiu confirmar no código — não documente suposições como fato.
- Todas as seções do template só porque existem — seção vazia ou genérica é ruído, não sinal.

## Quando Parar e Pedir Ajuda

- Convenções conflitantes coexistindo no código, sem forma clara de saber qual é a atual.
- Projeto grande demais para explorar com confiança em Modo Criação sem uma referência do parceiro humano sobre por onde começar.
- Modo Atualização sem forma de saber o que mudou desde a última vez (sem git, sem data de referência, e o parceiro humano não sabe dizer).
- Já existe um `AGENTS.md` com conteúdo claramente escrito à mão pelo parceiro humano, em estilo muito diferente do template acima — nesse caso, pergunte antes de reestruturar, em vez de impor o formato padrão por cima do que já existe.

Nesses casos, pergunte em vez de preencher o arquivo com suposições — um AGENTS.md impreciso é pior do que nenhum, porque os agentes vão confiar nele sem verificar.

## Lembre-se

- O arquivo só tem valor se for mais rápido de ler do que o projeto — mantenha-o compacto.
- Em Modo Atualização, edite só o que mudou; não reescreva o arquivo inteiro a cada chamada.
- Documente apenas o que foi observado no código, nunca suposições.
- Não duplique o que já vive em `references/` de outras skills — aponte para lá.
- Detalhe de tarefa específica não é contexto de projeto — pertence ao plano ou ao spec.
- AGENTS.md é um padrão aberto: escreva pensando que outras ferramentas de agente (Cursor, Codex, Windsurf etc.), não só esta skill, vão ler o arquivo.
