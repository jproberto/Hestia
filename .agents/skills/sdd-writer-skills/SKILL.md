---
name: sdd-writer-skills
description: Use para criar uma nova skill do fluxo SDD (etapa sequencial sdd-NN-nome, utilitário sdd-tool-nome, ou skill que escreve/mantém um artefato específico sdd-writer-nome) ou para revisar uma skill existente contra o padrão do projeto. Cobre captura de intenção, escolha de nome e categoria, escrita de frontmatter com description "pushy", estrutura padrão do corpo (Visão Geral/O Processo/Quando Parar e Pedir Ajuda/Lembre-se), checklist de autorrevisão e atualização do catálogo central em `.agents/skills.md`. Esta é, ela mesma, uma skill writer — mantém as skills do projeto e o catálogo central. Não usar para escrever o conteúdo de domínio de uma skill sem antes confirmar com o parceiro humano qualquer convenção de projeto que não esteja documentada em `AGENTS.md` ou observável no código.
---

# Escrevendo Skills SDD

## Visão Geral

Toda skill deste projeto segue o mesmo esqueleto estrutural, para que qualquer agente que a leia — nesta sessão ou em outra — saiba onde encontrar o quê sem precisar reaprender o formato a cada vez. Esta skill existe para essa consistência não depender de correção manual toda vez que uma skill nova é escrita.

**Anuncie no início:** "Estou usando a skill sdd-writer-skills para [criar/revisar] a skill `<nome>`."

**Sem infraestrutura de evals:** este projeto não tem acesso a scripts de teste automatizado de skill. A garantia de qualidade aqui é o checklist do Passo 5 mais a revisão do parceiro humano — não um loop de avaliação automatizado. Não finja rigor que não existe.

## O Processo

### Passo 1: Capturar a Intenção

Responda antes de escrever qualquer linha:

1. O que a skill deve permitir que o agente faça?
2. Quando ela deve disparar — que pedido, contexto ou fase do fluxo aciona ela?
3. Qual é a saída esperada (arquivo, plano, decisão, ação)?
4. É uma etapa sequencial do fluxo SDD ou um utilitário sob demanda? (ver Passo 2)

Se a conversa já contém o suficiente para responder (ex: "transforma isso numa skill"), extraia as respostas dali em vez de perguntar de novo. Se algo continuar ambíguo depois disso, pergunte — não adivinhe intenção nem convenção de projeto.

### Passo 2: Determinar Nome e Categoria

Três categorias, sem quarta opção:

- **Sequencial** (`sdd-NN-nome`): uma etapa fixa do fluxo principal, executada em ordem (hoje: `sdd-01-brainstorm`, `sdd-02-plan`, `sdd-03-implement`, `sdd-04-review`). Só cria uma nova etapa sequencial se ela realmente ocupar uma posição fixa no fluxo — não force uma skill de uso ocasional nesse formato.
- **Writer** (`sdd-writer-nome`): sob demanda, e sua responsabilidade central é escrever e manter um artefato específico e duradouro do projeto (hoje: `sdd-writer-agents` mantém `AGENTS.md`, `sdd-writer-skills` — esta própria skill — mantém as skills e o catálogo). Se a pergunta "o que essa skill produz e mantém ao longo do tempo?" tem uma resposta de um artefato só, é writer.
- **Tool** (`sdd-tool-nome`): sob demanda, mas não gira em torno de manter um artefato — executa uma ação pontual (hoje: `sdd-tool-commit`, `sdd-tool-debug`). Se a skill não deixa um documento vivo para trás como sua responsabilidade principal, é tool.

Nenhuma das duas categorias sob demanda (`writer`/`tool`) faz parte da sequência numerada.

Antes de fixar o nome:

1. Leia `.agents/skills.md` (o catálogo central) para ver o que já existe e evitar colisão de nome ou de responsabilidade com uma skill que já cobre o mesmo caso.
2. Se for sequencial, confirme a posição exata no fluxo — não insira um novo número sem checar se quebra a ordem das demais.

### Passo 3: Escrever o Frontmatter

```yaml
---
name: sdd-NN-nome-ou-sdd-tool-nome-ou-sdd-writer-nome
description: [o que faz] + [quando disparar, com linguagem "pushy" — cubra sinônimos e contextos, não só a frase óbvia] + [quando NÃO usar, se houver risco de confusão com skill vizinha]
---
```

Regras:

- `name` no frontmatter deve ser idêntico ao nome do diretório.
- A description é o único material sempre em contexto antes da skill disparar — inclua ali tudo que decide "quando usar", não deixe isso só no corpo.
- Escreva a description um pouco mais "insistente" do que pareceria necessário: é comum uma skill deixar de disparar quando deveria. Prefira "use sempre que X, Y ou Z, mesmo que o pedido não use essas palavras exatas" a uma frase seca.
- Se houver skill vizinha com escopo parecido, inclua a distinção explícita ("não usar para X — isso é responsabilidade de sdd-Y").

### Passo 4: Escrever o Corpo na Estrutura Padrão

Use exatamente este esqueleto, adaptando o conteúdo interno:

```markdown
# Título em Poucas Palavras

## Visão Geral

[Parágrafo curto: o que esta skill faz e o princípio central por trás dela.]

**Anuncie no início:** "Estou usando a skill sdd-XXX para [ação]."

[Opcional: **Onde encontrar/salvar X:** convenção de path relevante.]

## O Processo

### Passo 1: [Nome da Ação]

[Instruções concretas e executáveis. Não escreva tópico de referência solto —
cada Passo é uma ação real que o agente executa, na ordem.]

### Passo 2: [Nome da Ação]

...

## Quando Parar e Pedir Ajuda

[Lista de condições concretas em que a skill deve parar e perguntar
em vez de assumir ou inventar. Toda skill deste projeto tem essa seção.]

## Lembre-se

[Lista curta dos pontos que mais importa não esquecer — reforço, não
conteúdo novo.]
```

Regras de conteúdo, não negociáveis neste projeto:

- Português, tom direto, sem enfeite.
- **Robustez e Detalhe:** A skill deve ser detalhada o suficiente para guiar um agente de forma inequívoca. Compare com skills de referência como `sdd-03-implement` ou `sdd-tool-tracking`. Os passos devem ser ações concretas, as condições de parada devem ser claras e as seções de lembrete devem reforçar os pontos críticos.
- Nenhuma seção `## Integração`. Relações entre skills (quem chama quem, o que cada uma espera como entrada) vivem só em `.agents/skills.md` — nunca duplicadas dentro de uma SKILL.md individual, exceto quando a referência é operacionalmente necessária ao próprio funcionamento da skill (ex: um plano gerado precisa instruir "use sdd-03-implement" porque isso é conteúdo do artefato produzido, não uma lista decorativa).
- Nenhum placeholder: nada de "TBD", "trate como apropriado", "adicione validação". Se um passo não tem conteúdo concreto ainda, a skill não está pronta para ser mostrada ao parceiro humano.
- Cada `### Passo N` é uma ação sequencial de verdade. Regras auxiliares de como executar um passo (formato, convenções, casos especiais) entram como sub-bullets dentro do passo — não viram um novo Passo artificial só para preencher a estrutura.
- Se o corpo passar de ~500 linhas, não continue empilhando conteúdo: crie `references/<tema>.md` e aponte para ele a partir do passo relevante, indicando quando o agente deve abrir esse arquivo.

### Passo 5: Autorrevisão

Antes de mostrar o rascunho ao parceiro humano, confira item por item:

- [ ] `name` do frontmatter é idêntico ao nome do diretório.
- [ ] Nome segue a convenção (`sdd-NN-nome` sequencial, `sdd-writer-nome` se mantém um artefato específico, ou `sdd-tool-nome` para as demais ações pontuais), sem colisão com o catálogo.
- [ ] Description cobre trigger (com variações de fraseado) e, quando relevante, anti-trigger.
- [ ] "Anuncie no início" presente, com o nome exato da skill na frase.
- [ ] Estrutura contém `Visão Geral` → `O Processo` (`### Passo N`) → `Quando Parar e Pedir Ajuda` → `Lembre-se`, nessa ordem.
- [ ] Nenhuma seção `Integração`.
- [ ] Nenhum placeholder ou instrução vaga.
- [ ] Cada Passo é uma ação real, não um tópico de referência inflado para caber no formato.
- [ ] Nada foi inventado sobre o projeto (convenção, comando, estrutura) sem checar `AGENTS.md` ou o código primeiro.
- [ ] **Nível de Detalhe:** A skill é tão robusta e detalhada quanto outras skills de referência (ex: `sdd-03-implement`, `sdd-tool-tracking`)? Os passos são específicos, os cenários de falha são cobertos e as seções "Quando Parar" e "Lembre-se" são concretas e úteis.

Corrija tudo que falhar antes de seguir para o Passo 6. Não entregue um rascunho sabendo que ele falha no checklist.

### Passo 6: Atualizar o Catálogo Central

Atualize `.agents/skills.md` (crie se não existir, com um cabeçalho simples de tabela ou lista):

- Nome da skill.
- Categoria (sequencial, com posição no fluxo, ou utilitário).
- Uma frase do que ela faz.
- Quando ela normalmente é chamada (ex: "depois de sdd-04-review aprovar", "sob demanda quando um teste falha sem causa clara").

Esta é a única fonte de relações entre skills do projeto — mantenha-a atualizada em vez de reintroduzir isso dentro de cada SKILL.md.

### Passo 7: Apresentar ao Parceiro Humano

Mostre o rascunho junto com:

- Qualquer suposição feita no Passo 1 ou 2 que não foi explicitamente confirmada.
- O resultado do checklist do Passo 5 (só o que foi corrigido, não é preciso listar os itens que já estavam certos).

Peça confirmação antes de considerar a skill finalizada — na ausência de evals automatizados, esta é a única verificação real de qualidade.

## Quando Parar e Pedir Ajuda

- A intenção da skill (Passo 1) continua ambígua depois de checar a conversa.
- Não está claro se a skill é sequencial ou utilitário, e isso muda o nome e a posição no catálogo.
- O nome proposto colide com uma skill existente, ou o escopo se sobrepõe a uma skill já catalogada sem uma distinção clara entre as duas.
- A skill precisaria documentar uma convenção de projeto (comando, stack, estilo) que não está em `AGENTS.md` nem é observável no código — pergunte em vez de supor.
- O corpo da skill ultrapassaria ~500 linhas mesmo depois de mover conteúdo para `references/` — pare e reavalie se a skill não deveria ser dividida em duas.

## Lembre-se

- Três categorias só: `sdd-NN-nome` sequencial, `sdd-writer-nome` para quem mantém um artefato específico, `sdd-tool-nome` para o resto das ações pontuais — nunca um nome fora desse padrão.
- A description decide o disparo; escreva-a "pushy" e completa, não deixe informação de trigger só no corpo.
- Esqueleto fixo: Visão Geral → O Processo (Passo N) → Quando Parar e Pedir Ajuda → Lembre-se.
- Sem seção Integração — isso vive em `.agents/skills.md`.
- Sem placeholder, sem passo artificial só para caber no formato.
- Sem infraestrutura de evals aqui: o checklist do Passo 5 e a revisão humana são a garantia de qualidade.
- Sempre atualize `.agents/skills.md` depois de criar ou alterar uma skill — uma skill nova que não entra no catálogo é invisível para o resto do sistema.
