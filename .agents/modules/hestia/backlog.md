# Backlog — Héstia (Guarda-Chuva de Módulos)

## Contexto do produto-guarda-chuva

Héstia é um guarda-chuva de sub-sistemas pessoais/familiares. A infraestrutura comum é compartilhada: Next.js hospedado na Vercel, um único projeto Supabase e o fluxo SDD em `.agents/`.

A organização segue o padrão **módulo por camada**: dentro de cada namespace da raiz (`app`, `components`, `lib`, `__tests__`), tudo exclusivo de um módulo vive em `<camada>/<modulo>/`; o que é compartilhado permanece na raiz da camada. Na documentação, cada módulo tem `.agents/modules/<modulo>/` com `backlog.md` + `regression.md` por módulo e `FEATURE_DIR=.agents/modules/<modulo>/<slug>/` por feature (`spec.md`, `plan.md`, `tasks.json`, `context.json`, `checkpoint.json`); transversal em `modules/hestia/`.

## Módulos Registrados

| # | Módulo | Domínio | Pasta | Backlog do Módulo |
|---|---|---|---|---|
| 1 | **Pluto** | Finanças familiares: orçamento anual, meses operacionais, lançamentos, checklist de contas e saldo. | `pluto` | [.agents/modules/pluto/backlog.md](file:///p:/workspace/IA/hestia/.agents/modules/pluto/backlog.md) |

---

## Backlog — Estrutural / Infraestrutura

> Débitos técnicos são acompanhados por ciclo (épico por relatório); o detalhamento por item vive nos relatórios, não aqui.

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|--- |
| 1 | **Modularização: módulo Pluto** | Transforma o Héstia em um guarda-chuva de sub-sistemas: todo o código e documentação exclusivos do módulo financeiro passa a viver dentro das pastas `<camada>/pluto/` e `.agents/modules/pluto/`, estabelecendo o padrão estrutural para os próximos módulos. Quebra limpa, sem convivência com legado. URLs `/finance/*` → `/pluto/*`. | Concluído | [.agents/modules/hestia/01-modularizacao-pluto/spec.md](file:///p:/workspace/IA/hestia/.agents/modules/hestia/01-modularizacao-pluto/spec.md) | [.agents/modules/hestia/01-modularizacao-pluto/plan.md](file:///p:/workspace/IA/hestia/.agents/modules/hestia/01-modularizacao-pluto/plan.md) |
| 2 | **Sistema Multi-Agentes (Olympus)** | Arquitetura completa 8 agentes (Zeus, Hera, Atena, Hefesto, Minos, Argos, Mnemósine, Caronte) orquestrados via Task tool, estado persistente em `FEATURE_DIR`, checkpoints humanos, resiliência nativa (Task tool + git_retry bash). Sem CLI externo. | Concluído | [.agents/modules/hestia/02-multiagent-system/spec.md](file:///p:/workspace/IA/hestia/.agents/modules/hestia/02-multiagent-system/spec.md) | [.agents/modules/hestia/02-multiagent-system/plan.md](file:///p:/workspace/IA/hestia/.agents/modules/hestia/02-multiagent-system/plan.md) |
| 3 | **Refatoração arquitetural — ciclo 08-09** | Decomposição da TransactionsPage (hooks, componentes, página enxuta) e do ChecklistCard; camadas (interfaces, use-cases, Zod, tipos consolidados); fakes, contratos, testes de interação; Storybook; gerador de módulos; backlog em dia. | Concluído | [.agents/reports/2026-09-08-technical-debt-assessment.md](file:///p:/workspace/IA/hestia/.agents/reports/2026-09-08-technical-debt-assessment.md) | [.agents/reports/2026-09-08-technical-debt-assessment-log.md](file:///p:/workspace/IA/hestia/.agents/reports/2026-09-08-technical-debt-assessment-log.md) |
| 4 | **Dívidas técnicas restantes — ciclo 09-09** | Destino da camada morta, mapa de camadas/docs, gerador atualizado, single-flight do fetch, decomposição das pages restantes, singleton de client, auth na porta de dados, higiene de testes e de tipos. Detalhe no relatório. | Concluído (41–50 executadas, commit único) | [.agents/reports/2026-09-09-technical-debt-reassessment.md](file:///p:/workspace/IA/hestia/.agents/reports/2026-09-09-technical-debt-reassessment.md) | [.agents/reports/2026-09-08-technical-debt-assessment-log.md](file:///p:/workspace/IA/hestia/.agents/reports/2026-09-08-technical-debt-assessment-log.md) (ciclo 09-09) |
| 5 | **Saúde do projeto pós-ciclo 09-09 (tasks 51–61)** | Build de produção (server factory fora do bundle), 2ª camada morta (hooks legados + standalones + `services/`), `useTransactionModals`, bug visual Hestia (background), higiene Olympus/docs, decisão contracts-vs-Supabase, RLS pendente. Detalhe no relatório. | Concluído (51–61 executadas, sem commit) | [.agents/reports/2026-09-10-project-health-assessment.md](file:///p:/workspace/IA/hestia/.agents/reports/2026-09-10-project-health-assessment.md) | [.agents/reports/2026-09-08-technical-debt-assessment-log.md](file:///p:/workspace/IA/hestia/.agents/reports/2026-09-08-technical-debt-assessment-log.md) (ciclos 09-09/09-10) |
