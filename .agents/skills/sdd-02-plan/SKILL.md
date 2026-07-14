---
name: sdd-02-plan
description: Use quando houver uma spec, requisitos ou design aprovado para uma tarefa de múltiplas etapas, antes de tocar em código. Escreve um plano de implementação completo e executável, com escopo, estrutura de arquivos, tarefas pequenas, passos TDD, código necessário, comandos exatos, saídas esperadas, commits frequentes, auto-revisão e handoff para execução. Não usar para implementar código diretamente, nem sem uma spec/design aprovado — nesse caso, use sdd-01-brainstorm primeiro.
---

# Escrevendo Planos

## Visão Geral

Escreva planos de implementação completos assumindo que o executor é um desenvolvedor habilidoso, mas tem quase zero contexto do codebase, do domínio do problema e das convenções locais.

Documente tudo que ele precisa saber:

- Quais arquivos tocar em cada tarefa.
- Qual código escrever ou alterar.
- Quais testes criar.
- Quais comandos executar.
- Quais documentos consultar.
- Como saber que a tarefa passou.
- Quando commitar.

O plano deve quebrar a implementação em tarefas pequenas, rastreáveis e revisáveis.

Princípios: DRY, YAGNI, TDD e commits frequentes.

**Anuncie no início:** "Estou usando a skill sdd-02-plan para criar o plano de implementação."

**Onde salvar o plano:** `.agents/plans/YYYY-MM-DD-<topico>-plan.md`, salvo se o usuário ou o projeto já tiver outra convenção — nesse caso, use a convenção existente.

## O Processo

### Passo 1: Verificar Conformidade do Processo (Novo)

Antes de qualquer outra ação, invoque a `sdd-tool-guardian` para garantir que esta skill está sendo chamada no momento correto do fluxo.

### Passo 2: Levantar as Entradas

Use esta skill depois de uma spec aprovada, normalmente criada por `sdd-01-brainstorm`.

Fontes úteis:

- `.agents/specs/YYYY-MM-DD-<topico>-design.md`
- Spec indicada pelo usuário.
- Requisitos na conversa.
- Código existente.
- Testes existentes.
- Docs do projeto.
- `AGENTS.md` na raiz, se existir — convenções, comandos de build/teste e estrutura documentados ali têm precedência sobre suposições.

Preferências explícitas do usuário ou do projeto sobrescrevem os caminhos padrão. Se nenhuma spec, requisito claro ou design aprovado existir, não invente escopo (ver "Quando Parar e Pedir Ajuda").

### Passo 3: Scope Check

Verifique se a spec cobre múltiplos subsistemas independentes.

Se a spec deveria ter sido quebrada durante o brainstorming e não foi, diga isso e sugira decompor em planos separados, um por subsistema.

Cada plano deve produzir software funcionando e testável por conta própria.

Exemplos de sinais de plano grande demais:

- Uma mesma spec inclui autenticação, billing, analytics e chat.
- O plano exigiria várias frentes independentes com pouca interação.
- Uma task precisaria mexer em muitos módulos sem entregar comportamento testável.
- A implementação só ficaria verificável no final de tudo.

Quando isso acontecer, não force um plano gigante. Proponha divisão e peça aprovação antes de continuar.

### Passo 4: Mapear a Estrutura de Arquivos

Antes de definir tarefas, mapeie quais arquivos serão criados ou modificados e qual será a responsabilidade de cada um.

Essa é a etapa em que as decisões de decomposição ficam travadas.

Inclua:

- `Create`: arquivos novos, com responsabilidade clara.
- `Modify`: arquivos existentes, com motivo da mudança.
- `Test`: arquivos de teste.
- `Docs`: documentação quando necessário.

Regras:

- Desenhe unidades com fronteiras claras e interfaces bem definidas.
- Cada arquivo deve ter uma responsabilidade principal.
- Prefira arquivos menores e focados a arquivos grandes que fazem coisas demais.
- Arquivos que mudam juntos devem ficar próximos.
- Divida por responsabilidade, não por camada técnica de forma automática.
- Em codebases existentes, siga padrões locais.
- Se o projeto usa arquivos grandes, não reestruture unilateralmente.
- Se um arquivo que será modificado já está grande demais ou com responsabilidades confusas, incluir uma divisão local no plano é razoável.

A estrutura de arquivos deve informar a decomposição das tarefas. Cada tarefa deve produzir uma mudança autocontida que faça sentido de forma independente.

### Passo 5: Dimensionar as Tarefas

Uma tarefa é a menor unidade que:

- Tem seu próprio ciclo de teste.
- Produz um entregável independente.
- Merece o gate de um reviewer fresco.
- Pode ser rejeitada enquanto uma tarefa vizinha é aprovada.

Ao definir fronteiras:

- Incorpore setup, configuração, scaffolding e documentação à tarefa cujo entregável precisa deles.
- Não crie tasks soltas de "setup" se o setup não entrega valor verificável sozinho.
- Divida apenas quando um reviewer conseguir avaliar uma tarefa separadamente da outra.
- Cada tarefa deve terminar com algo testável.

Dentro de cada tarefa, cada passo deve ser uma ação única, de 2-5 minutos.

Bons passos:

- "Escrever o teste que falha."
- "Rodar o teste e confirmar que falha pelo motivo esperado."
- "Implementar o mínimo para fazer o teste passar."
- "Rodar o teste e confirmar que passa."
- "Rodar testes relacionados."
- "Commitar."

Passos ruins:

- "Implementar autenticação."
- "Adicionar validação."
- "Criar testes."
- "Ajustar frontend e backend."
- "Finalizar feature."

### Passo 6: Escrever o Cabeçalho do Plano

Todo plano deve começar com este cabeçalho:

```markdown
# [Nome da Feature] Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

Use checkbox (`- [ ]`) para acompanhamento. Marque com o emoji ✅ quando a tarefa estiver concluída.

**Objetivo:** [Uma frase descrevendo o que será construído]

**Arquitetura:** [2-3 frases sobre a abordagem]

**Tech Stack:** [Tecnologias e bibliotecas principais]

## Restrições Globais

[Requisitos globais da spec: versões mínimas, limites de dependência, regras de naming/copy, plataformas, performance, privacidade e compatibilidade. Copie valores exatos da spec. Toda task herda esta seção implicitamente.]

---
```

Não use o cabeçalho como formalidade vazia. Ele precisa conter informação suficiente para orientar o executor.

### Passo 7: Escrever Cada Tarefa

Use este formato para cada tarefa:

````markdown
### Tarefa N: [Nome do componente ou comportamento]

**Arquivos:**
- Criar: `exact/path/to/file.py`
- Modificar: `exact/path/to/existing.py`
- Testar: `tests/exact/path/to/test_file.py`

**Interfaces:**
- Consome: [o que esta tarefa usa de tarefas anteriores: assinaturas exatas, tipos, eventos, contracts]
- Produz: [o que tarefas futuras dependem: nomes de função, parâmetros, retorno, tipos, schema]

- [ ] **Passo 1: Escreva o teste que falha**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Passo 2: Execute o teste para garantir que ele falha**

Run: `pytest tests/path/test_file.py::test_specific_behavior -v`
Expected: FAIL with "function not defined"

- [ ] **Passo 3: Escreva implementação mínima**

```python
def function(input):
    return expected
```

- [ ] **Passo 4: Execute o teste para garantir que ele passa**

Run: `pytest tests/path/test_file.py::test_specific_behavior -v`
Expected: PASS

- [ ] **Passo 5: Commit**

```bash
git add tests/path/test_file.py src/path/file.py
git commit -m "feat: add specific behavior"
```
````

Adapte linguagem, framework e comandos ao projeto. Preserve a estrutura.

**Interfaces entre tarefas:** o executor de uma tarefa pode ver apenas aquela tarefa. O bloco `Interfaces` é como ele descobre nomes, tipos e contratos usados por tarefas vizinhas. Se uma tarefa posterior usa algo criado antes, escreva exatamente: nome da função/classe/componente, parâmetros, tipo de retorno, eventos emitidos, schema de dados, path de import, config ou env vars. Não use nomes aproximados — inconsistência entre tarefas é bug de plano.

**TDD:** planeje TDD como padrão para qualquer mudança de comportamento — escrever teste que falha, rodar e confirmar falha pelo motivo certo, implementar o mínimo, rodar e confirmar sucesso, refatorar somente com teste verde, rodar testes relacionados, commitar. Se TDD não fizer sentido para uma parte específica, explique no plano e forneça uma verificação alternativa objetiva.

**Commits frequentes:** inclua passos de commit em cada tarefa ou em pontos naturais pequenos. Commits devem vir depois de verificações verdes, incluir arquivos exatos no `git add`, ter mensagem específica, e não misturar tarefas independentes. Se o projeto não for um repositório git, omita passos de commit e registre essa condição no plano.

**Sem placeholders:** cada passo deve conter o conteúdo real de que o executor precisa. São falhas de plano: `TBD`, `TODO`, "implementar depois", "preencher detalhes", "adicionar error handling apropriado", "adicionar validação", "tratar edge cases", "escrever testes para o código acima", "similar à Task N", passos que dizem o que fazer sem mostrar como, ou referências a tipos/funções/métodos não definidos em nenhuma tarefa. Quando um passo altera código, inclua o código ou um patch suficientemente específico. Quando um passo executa comando, inclua comando exato, diretório quando relevante, resultado esperado, e falha esperada quando for etapa red do TDD. Repita detalhes necessários mesmo que pareça redundante — o executor pode ler tasks fora de ordem ou com contexto reduzido.

### Passo 8: Self-Review

Depois de escrever o plano completo, revise a spec com olhar fresco e confira o plano contra ela.

Esta é uma checklist que você executa diretamente. Não despache subagente para isso.

1. **Cobertura da spec.** Percorra cada seção e requisito da spec. Para cada um, responda: qual task implementa isso, qual teste ou verificação prova isso, alguma restrição global foi esquecida. Liste lacunas e corrija o plano. Se um requisito da spec não tem task, adicione uma task.
2. **Busca por placeholders.** Procure os padrões proibidos do Passo 7 (`TBD`, `TODO`, "similar", "apropriado", "edge cases", "validar", "implementar depois"). Corrija inline — não deixe observações vagas para o executor resolver.
3. **Consistência.** Verifique se tipos, assinaturas, nomes de métodos, props, eventos, paths e schemas usados em tasks posteriores batem com o que foi definido em tasks anteriores (ex: Task 3 cria `clearLayers()`, Task 7 chama `clearFullLayers()` — bug de plano). Corrija o plano diretamente.
4. **Ordem de execução.** Confira se nenhuma task depende de código, tipo, config ou arquivo ainda não criado. Se a ordem estiver errada, reordene as tasks ou mova a criação da interface para a task anterior.
5. **Qualidade de verificação.** Confira se cada task termina com verificação objetiva: teste específico, comando exato, resultado esperado, falha esperada na etapa red, comando final de regressão quando necessário. Se a verificação é "olhar manualmente", explique exatamente o que observar.
6. **Riscos de Ferramentas Externas.** O plano depende de CLIs (`npx`, `npm`, etc.)? Se sim, o plano considera pré-requisitos (ex: diretório vazio), interatividade e rotas de recuperação caso o comando falhe? O plano assume um "caminho feliz" irrealista?

### Passo 9: Entregar o Plano

Depois de salvar o plano, informe o início da execução:

```text
Plano completo e salvo em `<path>`.

Agora vamos à implementação, task por task. Podemos começar?
```

- Use `sdd-03-implement`.
- Execute task por task nesta sessão.
- Use checkpoints para revisão.

Não comece a implementação dentro desta skill. O estado final de `sdd-02-plan` é o plano salvo e a escolha de execução.

## Quando Parar e Pedir Ajuda

- Não há spec, requisitos ou design aprovado — peça para rodar `sdd-01-brainstorm` ou fornecer os requisitos, em vez de inventar escopo.
- A spec cobre múltiplos subsistemas independentes demais para um único plano (Passo 3) — proponha a divisão e espere aprovação antes de escrever qualquer plano.
- Um requisito da spec é ambíguo o suficiente para que decompor em tasks exigiria adivinhar uma decisão de produto ou arquitetura — pergunte em vez de assumir.
- O projeto não tem convenção de testes, build ou commit discernível (nem em `AGENTS.md`, nem no código, nem no histórico) e a lacuna afeta a task — pergunte a convenção em vez de inventar uma.
- O Self-Review (Passo 8) encontra uma lacuna que só pode ser fechada inventando comportamento não especificado na spec — volte à spec com o parceiro humano em vez de preencher com suposição.

Nesses casos, pare e pergunte. Um plano que preenche lacunas com suposição transfere o problema para quem for executar, quando o ponto desta skill é justamente eliminar essa ambiguidade antes da implementação.

## Lembre-se

- **Planeje defensivamente:** Antecipe falhas em comandos de CLI. Tenha planos de recuperação e não assuma o "caminho feliz".
- Paths exatos sempre.
- Código completo em cada passo que muda código.
- Comandos exatos com output esperado.
- Se o agente executor não tiver permissão para rodar um comando, ele deve preparar o comando exato, anunciar o bloqueio e pedir ao parceiro humano para executá-lo.
- DRY.
- YAGNI.
- TDD.
- Commits frequentes.
- Nada fora da spec aprovada.
- Nenhum placeholder, nem "similar à Task N", nem "adicionar validação apropriada".
- Interfaces entre tarefas com nomes exatos, nunca aproximados.
