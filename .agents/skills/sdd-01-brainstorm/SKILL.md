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
2. Se você estiver em `main` ou `develop`, crie uma nova branch a partir da `develop`. O nome deve seguir o padrão `feature/<nome-descritivo>`. Nunca commite direto em `main` ou `develop`.
3. Se você já estiver em uma branch de feature, pergunte ao parceiro humano se é a branch correta para a feature que está iniciando. Se não for, crie uma nova a partir da `develop`.

### Passo 3: Consultar e Atualizar o Backlog

Antes de iniciar as discussões, localize a funcionalidade correspondente no arquivo `.agents/backlog.md`:
- Altere seu status para `Em Especificação`.
- Use o ID desse item do backlog como prefixo para a futura spec e planos (ex: `01-contas-spec.md`).

### Passo 4: Explorar o Contexto do Projeto

Antes de fazer perguntas detalhadas, verifique o estado atual do projeto:

- O arquivo de backlog `.agents/backlog.md` para entender as restrições globais e dependências.
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

### Passo 6: Fazer Perguntas de Esclarecimento

Para projetos com escopo adequado, faça perguntas uma por vez.

Regras:

- Uma pergunta por mensagem.
- Preferir múltipla escolha quando isso reduzir esforço do usuário.
- Usar pergunta aberta quando a resposta realmente precisa de nuance.
- Separar tópicos grandes em perguntas menores.
- Focar em propósito, restrições e critérios de sucesso.
- Não transformar a etapa em interrogatório; pare quando houver clareza suficiente.

Perguntas úteis:

- Qual problema isso resolve?
- Quem usa?
- Qual é a menor versão útil?
- O que precisa acontecer para considerarmos sucesso?
- O que está fora de escopo?
- Há stack, prazo, orçamento ou integração obrigatória?
- Que dados entram e saem?
- Que comportamento não pode quebrar?
- Que decisão você já tomou e não quer rediscutir?

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
.agents/specs/<ID>-<slug>-spec.md
```
*(Onde <ID> é o número do item no backlog e <slug> é o nome curto em inglês da funcionalidade. Exemplo: `01-contas-spec.md`)*

**Specs de Correção/Patch**:
Se o objetivo for corrigir ou estender uma especificação já existente após um ciclo de homologação/bug (um patch na spec):
- O arquivo deve receber um novo nome para preservar o histórico. O padrão de ID é `<ID da principal><letra sequencial>` (exemplo: `02a-ajuste-orcamento-spec.md` para o primeiro patch do item `02`).
- Branches de patch de spec podem seguir na mesma branch da spec principal ou em uma nova branch de feature, conforme a preferência do usuário.

Preferências explícitas do usuário ou do projeto sobrescrevem esse caminho. Se já existir uma convenção local para specs, use a convenção local.

**Atualização do Backlog:**
Ao finalizar e commitar a especificação, certifique-se de adicionar o link para a spec e mudar o status do item correspondente no `.agents/backlog.md` para `Especificado` após a aprovação do usuário.

Use escrita clara, objetiva e curta. Consulte references/writing-the-spec.md para o critério de quando um item está específico o suficiente para ser útil (especialmente problema, comportamento esperado e critérios de aceite). A spec não deve tentar impressionar por volume; ela deve preservar decisões importantes, reduzir ambiguidade e permitir que a próxima etapa escreva um plano de implementação confiável.

Inclua o que for necessário para reconstruir o design aprovado: problema, decisão tomada, alternativas rejeitadas, comportamento esperado, restrições, riscos e critérios de aceite. Não use uma lista fixa de seções como checklist mecânico. Se uma seção não ajuda a entender ou implementar, deixe fora.

Se o projeto estiver em um repositório git e o fluxo local permitir, commite o documento de design na branch de trabalho confirmada antes de avançar para o plano. Se não houver repositório git, ou se o usuário não quiser commit agora, apenas salve o arquivo.

### Passo 10: Auto Revisar a Spec

Depois de escrever a spec, revise com olhar fresco, com foco em clareza e concisão:

1. **Placeholder scan**: há `TBD`, `TODO`, seções incompletas ou requisitos vagos?
2. **Consistência interna**: alguma parte contradiz outra?
3. **Alinhamento**: a arquitetura combina com a descrição da feature?
4. **Escopo**: está focado o bastante para um único plano de implementação, ou precisa decompor?
5. **Ambiguidade**: algum requisito pode ser interpretado de duas formas?
6. **YAGNI**: há algo que não precisa existir na primeira versão?

Corrija problemas inline. Não peça nova revisão para cada ajuste pequeno; limpe a spec e só então leve ao usuário.

### Passo 11: Pedir Revisão do Usuário

Peça ao usuário para revisar o arquivo antes de seguir:

```text
Spec escrita em `<path>`. Revise e me diga se quer mudar algo antes de começarmos a escrever o plano de implementação.
```

Aguarde a resposta do usuário. Se ele pedir mudanças, faça as alterações e rode a auto-revisão novamente (Passo 10). Só prossiga quando o usuário aprovar.

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
- Spec salva em `.agents/specs/<ID>-<slug>-spec.md`, commitada no Git.
- O arquivo `.agents/backlog.md` atualizado com o status `Especificado` para a feature correspondente, com o link para o arquivo da spec.
- Auto-revisão executada.
- Aprovação do usuário para seguir.
- Próximo passo claro: `sdd-02-plan`.
