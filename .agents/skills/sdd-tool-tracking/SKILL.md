---
name: sdd-tool-tracking
description: Use para criar e manter o Diário de Bordo da execução de um plano. Registra o progresso das tarefas usando checkboxes e documenta decisões de arquitetura, incidentes, justificativas de refatoração e resoluções de problemas em formato Markdown (.md). Essencial para manter o histórico de decisões e visibilidade pós-mortem da implementação.
---

# Rastreamento de Execução (Diário de Bordo)

## Visão Geral

Esta skill gerencia o rastreador de execução (`<slug>-tracker.md`) para fornecer um histórico legível de decisões técnicas e de progresso. Em vez de logs textuais crus, ele funciona como um **diário de bordo** contendo a checklist atualizada de tarefas e um histórico de eventos enriquecido com incidentes e decisões de engenharia.

**Anuncie no início:** "Estou usando a skill `sdd-tool-tracking` para documentar o progresso e decisões no diário de bordo."

**Onde salvar o tracker:** `.agents/logs/<slug>-tracker.md` *(Onde <slug> é o identificador da feature, ex: `01-orcamento-tracker.md`)*.

---

## O Processo

### Passo 1: Inicializar o Diário de Bordo (Tracker)

*Este passo só é executado no início da execução de um novo plano.*

1.  Crie o arquivo `.agents/logs/<slug>-tracker.md`.
2.  Adicione um título descritivo e a seção **Checklist de Progresso** utilizando caixas de seleção Markdown (`- [ ]`, `- [/]`, `- [x]`, `- [!]` para bloqueios).
3.  Adicione a seção **Diário de Bordo e Decisões Técnicas** com a primeira entrada informando a inicialização da branch e do plano.

*Exemplo de estrutura inicial:*
```markdown
# Diário de Execução: Orçamento Anual por Categoria (Feature 1)

## Checklist de Progresso
- [ ] Tarefa 1: Configurar a Infraestrutura de Testes (Vitest + JSDOM)
- [ ] Tarefa 2: Criar as Tabelas e Políticas no Banco de Dados (Supabase SQL)
- [ ] Tarefa 3: Desenvolver a Lógica de Negócio e Serviços (TDD)
- [ ] Tarefa 4: Criar a Página de Orçamento `/finance/budget`
- [ ] Tarefa 5: Integrar Atalho no Dashboard e Versão

## Diário de Bordo e Decisões Técnicas
- **[2026-07-16 23:11] (INFO)**: Início da execução do plano na branch `feature/orcamentoAnual`.
```

### Passo 2: Atualizar o Progresso da Tarefa

*Sempre que iniciar, concluir ou bloquear uma tarefa:*

1.  Abra o tracker da feature.
2.  Atualize a caixa de seleção da tarefa na checklist de progresso:
    *   `[/]` para tarefas em andamento.
    *   `[x]` para tarefas concluídas.
    *   `[!]` para tarefas bloqueadas ou com problemas.
3.  Adicione uma nova entrada datada na seção de histórico de eventos explicando a transição.

### Passo 3: Registrar Decisões e Incidentes de Engenharia (Alto Valor)

*Não registre apenas "Tarefa X iniciada". Use a seção de histórico para documentar qualquer fato relevante de engenharia:*
*   **Incidentes**: "O linter falhou na regra de cascade renders síncronos no useEffect. Corrigimos envolvendo a chamada do serviço em setTimeout 0ms para adiar a execução".
*   **Decisões**: "Para evitar retrabalhos nas features de transações, desacoplamos o serviço de categorias em `lib/db/categories.ts` separado da lógica de orçamentos".
*   **Refatorações**: "Trocamos os casts de `as any` nos mocks por `as unknown as SupabaseClient` para satisfazer as regras estritas do linter e do compilador typescript".

*Formato recomendado de entrada:*
`- **[YYYY-MM-DD HH:MM] (TIPO)**: [Explicação descritiva da decisão, problema ou feito técnico].`

---

## Quando Parar e Pedir Ajuda

- Se você encontrar divergências de permissão para salvar no diretório `.agents/logs/`.
- Se o plano sofrer alterações drásticas que invalidem a checklist inicial.

## Lembre-se

- O Diário de Bordo deve ser em formato Markdown (`.md`), não `.log`.
- Documente o **porquê** das correções de linter/build, não apenas que elas foram feitas. Isso economiza tempo dos próximos agentes que herdarem o código.
- Mantenha a checklist de tarefas rigorosamente sincronizada com o status atual do seu desenvolvimento local.
