---
name: sdd-01-brainstorm
description: Use obrigatoriamente antes de qualquer trabalho criativo ou mudança de comportamento: criar features, componentes, funcionalidades, fluxos, projetos, refactors comportamentais ou alterações de UX/arquitetura. Explora intenção do usuário, contexto do projeto, requisitos, alternativas e design antes de qualquer implementação, gerando uma spec aprovada para o fluxo SDD.
---

# Brainstorming de Ideias em Designs

## Visão Geral

Transforme ideias em designs e specs completos por meio de uma conversa colaborativa, progressiva e disciplinada. Entenda o contexto, faça perguntas uma por vez, explore alternativas, apresente o design e obtenha aprovação explícita antes de qualquer implementação.

**Anuncie no início:** "Estou usando a skill sdd-01-brainstorm para desenhar este trabalho antes de implementar."

Não invoque skill de implementação, não escreva código, não crie scaffold, não instale dependências e não execute nenhuma ação de implementação até apresentar um design e receber aprovação. Isso vale para qualquer projeto, inclusive os que parecem simples.

## Anti-Pattern: "Isto É Simples Demais Para Precisar de Design"

Todo projeto passa por este processo. Uma TODO list, uma função utilitária, uma alteração de config, uma tela pequena ou um ajuste de comportamento: todos precisam de entendimento antes da implementação.

Projetos pequenos são justamente onde suposições não examinadas mais geram retrabalho. O design pode ser curto, até poucas frases quando o caso for realmente simples, mas ainda precisa ser apresentado e aprovado.

## O Processo

### Passo 1: Verificar Conformidade do Processo

Antes de qualquer outra ação, invoque a `sdd-tool-guardian` para garantir que esta skill está sendo chamada no momento correto do fluxo.

### Passo 2: Confirmar ou Criar a Branch de Trabalho

Antes de alterar, criar ou commitar qualquer arquivo (incluindo o backlog, specs ou código), confirme a branch Git ativa:
1. A regra principal é: toda nova branch de feature deve ser criada a partir da `develop`.
2. SEMPRE faça `git checkout develop` e em seguida `git pull origin develop` (ou `git pull`) para garantir que a base está 100% atualizada antes de criar a nova branch.
3. Se você estiver em `main` ou em outra branch de feature, mude para a `develop`, faça `git pull origin develop` e crie uma nova branch a partir da `develop`. O nome deve seguir o padrão `feature/<nome-descritivo>`. Nunca commite direto em `main` ou `develop`.
4. Se você já estiver na branch de feature correta para o trabalho, confirme com o parceiro humano se ela está atualizada com a `develop`.

### Passo 3: Consultar e Atualizar o Backlog

Antes de iniciar as discussões, localize a funcionalidade correspondente no backlog: `.agents/backlog.md` (itens estruturais/transversais) ou `.agents/<modulo>/backlog.md` (itens de um módulo registrado — consulte a tabela "Módulos Registrados" do backlog central):
- Altere seu status para `Em Especificação`.
- Use o ID desse item do backlog como prefixo para a futura spec e planos (ex: `01-contas-spec.md`).

### Passo 4: Explorar o Contexto do Projeto

Antes de fazer perguntas detalhadas, verifique o estado atual do projeto:

- O arquivo de backlog correspondente (`.agents/backlog.md` e/ou o do módulo) para entender as restrições globais e dependências.
- O guia de diretrizes de banco de dados `.agents/skills/sdd-01/brainstorm/references/db-preferences.md` (se existir) para convenções de modelagem.
- Arquivos e pastas existentes.
- Documentação disponível.
- Specs, planos ou tasks anteriores.
- Padrões de arquitetura.
- Convenções de UI, testes e dados.
- Histórico de git quando houver repositório.

### Passo 5: Avaliar o Escopo

Antes de refinar detalhes, avalie o tamanho do pedido. Se ele descreve várias partes independentes, pare e diga isso cedo.

Sinais de escopo grande demais:

- Plataforma com autenticação, billing, chat, analytics e storage no mesmo pedido.
- App completo com múltiplos perfis de usuário, dashboard, integrações e admin.
- Migração técnica somada a redesign, novas features e nova infraestrutura.
- Pedido que mistura produto, backoffice, API pública e automações externas.

Quando o escopo estiver grande demais:

1. Explique que isso precisa virar mais de um ciclo SDD.
2. Liste os subprojetos.
3. Mostre como eles se relacionam.
4. Sugira uma ordem de construção.
5. Escolha com o usuário o primeiro subprojeto.
6. Faça o brainstorming normal apenas desse primeiro subprojeto.

Cada subprojeto deve ter sua própria sequência: spec → plan → tasks → implementação → review.

### Passo 6: Conduzir o Discovery Competente de Produto

⚠️ **Atuação Proativa de Product Manager:** O agente NUNCA deve atuar como mero anotador de pedidos ou aceitar descrições superficiais. Seu papel é atuar como um Product Lead especialista, guiando o parceiro humano em uma investigação profunda e estruturada para descobrir o real valor de negócio, os atritos operacionais e os cenários não pensados antes de qualquer linha de especificação.

O agente deve conduzir o diálogo de discovery em 4 etapas estruturadas:

1. **Entendimento da Intenção & Problema Real:**
   - Em vez de aceitar o pedido no formato "quero a funcionalidade X", investigue a dor concreta: *"Qual problema do dia a dia você está tentando resolver? Quem é o usuário principal e como é o cenário de uso?"*

2. **Mapeamento da Jornada do Usuário & Experiência de Uso (UX):**
   - Guie o usuário passo a passo pela experiência visual e operacional:
     - *"Por onde o usuário inicia essa ação na interface?"*
     - *"Como é a navegação e o fluxo operacional (ex: ação única vs uso repetitivo/lote, modais, formulários)?"*
     - *"Qual o estado inicial dos elementos e para onde a atenção/foco é direcionada ao concluir?"*

3. **Mapeamento Proativo de Regras de Negócio e Casos de Borda (Edge Cases):**
   - O agente deve antecipar proativamente dúvidas e cenários de exceção específicos da funcionalidade que o usuário pode não ter considerado:
     - Comportamentos em estados não mencionados.
     - Alterações, edições parciais, cancelamentos ou estornos.
     - Validações de integridade de dados e concorrência.
     - Impacto em telas, dashboards ou agregações existentes.

4. **Fronteiras de Escopo & Definição do escopo (YAGNI):**
   - Ajude o parceiro humano a estabelecer limites claros:
     - *"Qual é a menor versão funcional que resolve a dor atual?"*
     - *"O que deixaremos explicitamente fora de escopo para evitar complexidade desnecessária?"*

Regras de Condução:
- **Diálogo Fluido e Relevante:** Não faça questionamentos genéricos ou checklists mecânicos. Cada pergunta deve demonstrar entendimento profundo do domínio da funcionalidade solicitada.
- **Uma Única Pergunta por Vez (Regra Estrita):** Faça EXATAMENTE UMA pergunta por turno (resposta do chat). É expressamente proibido agrupar múltiplos questionamentos ou listar várias perguntas simultâneas na mesma mensagem. Aguarde a resposta do usuário antes de enviar a pergunta seguinte.
- **NÃO GERE A SPEC** enquanto houver pontos cegos de UX, regras de negócio ou limites de escopo não resolvidos na conversa.

### Passo 7: Explorar Abordagens

Antes de fechar o design, apresente 2-3 abordagens diferentes, com trade-offs e recomendação. Consulte `references/exploring-approaches.md` para o que incluir em cada abordagem e como conduzir a comparação.

### Passo 8: Apresentar o Design

Quando entender o que será construído, apresente o design.

Dimensione cada seção à complexidade:

- Poucas frases para mudanças pequenas.
- Seções de 100-300 palavras quando houver nuance.
- Divisão por módulos quando houver arquitetura.
- Fluxos separados quando houver UX ou estados complexos.

Cubra, quando relevante: objetivo, usuários e cenários, arquitetura, componentes ou módulos, data flow, contratos e interfaces, estados de erro, testes, riscos, fora de escopo.

Depois de cada seção importante, pergunte se aquilo está correto antes de avançar. Se o usuário discordar, volte ao Passo 4 or 5, ajuste e reapresente.

Ao desenhar a arquitetura, divida o sistema em unidades menores com responsabilidade clara, interfaces bem definidas e dependências explícitas. Consulte `references/design-boundaries.md` para os critérios de uma boa fronteira entre unidades.

### Passo 9: Documentar

Escreva a spec:

O padrão deste projeto é salvar em:

```text
.agents/specs/<ID>-<slug>-spec.md            # features transversais / núcleo Héstia
.agents/<modulo>/specs/<ID>-<slug>-spec.md   # features de um módulo registrado
```
*(Onde <ID> é o número do item no backlog e <slug> é o nome curto em inglês da funcionalidade. Exemplo: `01-contas-spec.md`)*

**Onde fica o backlog da feature:** consulte a tabela "Módulos Registrados" no `.agents/backlog.md`. Se a feature pertencer a um módulo registrado (ex.: Pluto), use o backlog do módulo em `.agents/<modulo>/backlog.md` e salve a spec em `.agents/<modulo>/specs/`; caso contrário, use o backlog central e a raiz de `.agents/specs/`.

**Specs de Correção/Patch**:
Se o objetivo for corrigir ou estender uma especificação já existente após um ciclo de homologação/bug (um patch na spec):
- O arquivo deve receber um novo nome para preservar o histórico. O padrão de ID é `<ID da principal><letra sequencial>` (exemplo: `02a-ajuste-orcamento-spec.md` para o primeiro patch do item `02`).
- Branches de patch de spec podem seguir na mesma branch da spec principal ou em uma nova branch de feature, conforme a preferência do usuário.

Preferências explícitas do usuário ou do projeto sobrescrevem esse caminho. Se já existir uma convenção local para specs, use a convenção local.

**Atualização do Backlog:**
Após a aprovação da spec e o commit do artefato (próximo passo obrigatório), atualize o status do item no backlog correspondente (`​.agents/backlog.md` para transversais; `.agents/<modulo>/backlog.md` para módulos) para `Especificado`, adicionando o link para a spec salva.

**Fluxo recomendado:**
1. Spec escrita e aprovada pelo usuário
2. Executar `node .agents/scripts/sdd.js commit "spec: <descrição>"` para registrar a spec no git
3. Atualizar o status do backlog (pode ser no mesmo commit da spec ou imediatamente após)
4. Status no backlog passa de `Em Especificação` para `Especificado`

**Observação:** A atualização do status no backlog deve ser feita juntamente com o commit da spec, nunca como uma edição manual isolada. Isso garante rastreabilidade: o link direto de qual spec corresponde a qual status no backlog.

Use escrita clara, objetiva e curta. Consulte references/writing-the-spec.md para o critério de quando um item está específico o suficiente para ser útil (especialmente problema, comportamento esperado e critérios de aceite). A spec não deve tentar impressionar por volume; ela deve preservar decisões importantes, reduzir ambiguidade e permitir que a próxima etapa escreva um plano de implementação confiável.

⚠️ **Regra Fundamental de Especificação (Proibição Absoluta de Código)**: A Spec especifica exclusivamente requisitos, regras de negócio, contratos conceituais e critérios de aceite em linguagem natural. NENHUM CÓDIGO de qualquer natureza (TypeScript, React, SQL, DDL/DML, HTML ou CSS) pertence à etapa de brainstorming ou à Spec. A especificação de dados e banco deve ser feita exclusivamente via descrição textual dos modelos, campos e tipos lógicos.

Inclua o que for necessário para reconstruir o design aprovado: problema, decisão tomada, alternativas rejeitadas, comportamento esperado, restrições, riscos e critérios de aceite. Não use uma lista fixa de seções como checklist mecânico. Se uma seção não ajuda a entender ou implementar, deixe fora.

**Features com impacto visual:** quando a feature altera interface, registre na spec as referências de estilo aplicáveis — tokens semânticos existentes no tema global (ex: cores centralizadas em `app/globals.css`), componentes ou padrões visuais a reutilizar e os estados visuais esperados (positivo/negativo/vazio/carregando etc.). Requisitos visuais deixados implícitos tendem a emergir apenas como retrabalho durante a homologação; descrevê-los em texto (sem código) reduz esse ciclo.

⚠️ **Regra Fundamental de Commit Aprovado**: 
O commit da especificação via `node .agents/scripts/sdd.js commit` deve ser realizado EXCLUSIVAMENTE após a aprovação explícita e prévia do parceiro humano.

**Fluxo em 3 turnos distintos (obrigatório):**
• **Turno 1 (agora):** Spec escrita e apresentada ao usuário → usuário aprova verbalmente ou confirma aprovação no chat
• **Turno 2 (próximo):** Apenas após a aprovação explícita do usuário no turno anterior, executamos `node .agents/scripts/sdd.js commit "especificação: <descrição>"` → a spec fica registrada no git
• **Turno 3 (posterior):** Commits subsequentes (plano, tasks) seguem o mesmo padrão de aprovação prévia

**NUNCA** execute `node .agents/scripts/sdd.js commit` na mesma resposta em que a spec é criada. Apresenta a spec, encerra o turn e aguarda aprovação explícita do usuário para então commitar. O comando commit só será aceito após o usuário dizer "aprovado" em resposta à apresentação da spec.

### Passo 10: Auto Revisar a Spec

Depois de escrever a spec, revise com olhar fresco, com foco em clareza e concisão:

1. **Placeholder scan**: há `TBD`, `TODO`, seções incompletas ou requisitos vagos?
2. **Consistência interna**: alguma parte contradiz outra?
3. **Alinhamento**: a arquitetura combina com a descrição da feature?
4. **Escopo**: está focado o bastante para um único plano de implementação, ou precisa decompor?
5. **Ambiguidade**: algum requisito pode ser interpretado de duas formas?
6. **YAGNI**: há algo que não precisa existir na primeira versão?

Corrija problemas inline. Não peça nova revisão para cada ajuste pequeno; limpe a spec e só então leve ao usuário.

### Passo 11: Pedir Revisão do Usuário (Parada Obrigatória de Turno)

Peça ao usuário para revisar o arquivo antes de seguir:

```text
Spec escrita em `<path>`. Revise e me diga se quer mudar algo antes de começarmos a escrever o plano de implementação.
```

⚠️ **Parada Obrigatória de Turno (Stop & Wait):** É EXPRESSAMENTE PROIBIDO executar o comando `node .agents/scripts/sdd.js commit` na mesma iteração/resposta em que a spec é criada. O agente deve apresentar o caminho da spec, encerrar a sua resposta (turn) e AGUARDE a confirmação explícita do parceiro humano no chat. O commit via CLI deve ser executado exclusivamente em um turno posterior à aprovação.

### Passo 12: Transicionar para o Plano

Depois da aprovação da spec, invoque `sdd-02-plan` para criar o plano detalhado de implementação. Não invoque nenhuma outra skill — o próximo passo depois de brainstorming é exclusivamente `sdd-02-plan`.

## Trabalhando em Código Existente

Explore a estrutura antes de propor mudanças.

Faça:

- Seguir padrões existentes.
- Procurar implementações semelhantes.
- Entender helpers, componentes e convenções locais.
- Identificar constraints já assumidas pelo projeto.
- Propor melhorias locais quando o código afetado estiver dificultando a mudança.

Não faça:

- Refactor não relacionado.
- Reescrever arquitetura sem necessidade.
- Introduzir stack nova sem justificar.
- Ignorar convenções do projeto.
- Resolver problemas que não bloqueiam o objetivo atual.

## Quando Parar e Pedir Ajuda

**PARE e volte ao processo se perceber em si mesmo:**

- "É simples, vou implementar direto."
- "Depois escrevo a spec."
- "Já entendi o bastante" sem validar com o usuário.
- "Vou escolher a abordagem óbvia" sem alternativas.
- "Dá para colocar mais uma feature junto."
- "Vou refatorar essa parte inteira já que estou aqui."
- "Não precisa de aprovação porque é pequeno."

Esses sinais indicam risco de suposição não validada. Peça esclarecimento ao usuário em vez de seguir em frente com a suposição.

## Quando Retornar aos Passos Anteriores

**Volte para os Passos 4-6 quando:**
- O usuário discordar de alguma seção do design apresentado.
- Uma pergunta de esclarecimento revelar que o escopo era diferente do avaliado no Passo 3.

**Volte para o Passo 8 sempre que:**
- O usuário pedir qualquer mudança na spec durante o Passo 9.

## Lembre-se

- Uma pergunta por vez: não sobrecarregar o usuário.
- Múltipla escolha quando útil: facilita decisões.
- YAGNI com firmeza: remover features desnecessárias.
- Alternativas antes de decisão: sempre comparar 2-3 caminhos.
- Validação incremental: apresentar, confirmar e ajustar.
- Design antes de implementação: não pular o gate, mesmo em projetos pequenos.
- Escopo pequeno: decompor antes de tentar resolver tudo.
- Confirmar ou criar a branch a partir da `develop` antes de alterar ou escrever qualquer arquivo.
- Flexibilidade: voltar e esclarecer quando algo não fecha.

## Saída Esperada

Ao terminar esta skill, deve existir:

- Design aprovado em conversa.
- Branch confirmada ou criada, com prefixo adequado ao tipo de trabalho.
- Spec salva no local convencional (`.agents/specs/<ID>-<slug>-spec.md` ou `.agents/<modulo>/specs/<ID>-<slug>-spec.md`), commitada no Git.
- O arquivo de backlog correspondente (central ou do módulo) atualizado com o status `Especificado` para a feature, com o link para o arquivo da spec.
- Auto-revisão executada.
- Aprovação do usuário para seguir.
- Próximo passo claro: `sdd-02-plan`.
