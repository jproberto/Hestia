# Backlog — Héstia (Guarda-Chuva de Módulos)

## Contexto do produto-guarda-chuva

Héstia é um guarda-chuva de sub-sistemas pessoais/familiares. A infraestrutura comum é compartilhada: Next.js hospedado na Vercel, um único projeto Supabase e o fluxo SDD em `.agents/`.

A organização segue o padrão **módulo por camada**: dentro de cada namespace da raiz (`app`, `components`, `lib`, `__tests__`), tudo exclusivo de um módulo vive em `<camada>/<modulo>/`; o que é compartilhado entre módulos permanece na raiz da camada. Na documentação, cada módulo tem `.agents/<modulo>/` (`backlog.md`, `specs/`, `plans/`, `logs/`); artefatos transversais ficam na raiz de `.agents/`.

## Módulos Registrados

| # | Módulo | Domínio | Pasta | Backlog do Módulo |
|---|---|---|---|---|
| 1 | **Pluto** | Finanças familiares: orçamento anual, meses operacionais, lançamentos, checklist de contas e saldo. | `pluto` | [.agents/modules/pluto/backlog.md](file:///p:/workspace/IA/hestia/.agents/modules/pluto/backlog.md) |

---

## Backlog — Estrutural / Infraestrutura

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|--- |
| 1 | **Modularização: módulo Pluto** | Transforma o Héstia em um guarda-chuva de sub-sistemas: todo o código e documentação exclusivos do módulo financeiro passa a viver dentro das pastas `<camada>/pluto/` e `.agents/modules/pluto/`, estabelecendo o padrão estrutural para os próximos módulos. Quebra limpa, sem convivência com legado. URLs `/finance/*` → `/pluto/*`. | Concluído | [.agents/specs/01-modularizacao-pluto-spec.md](file:///p:/workspace/IA/hestia/.agents/specs/01-modularizacao-pluto-spec.md) | [.agents/plans/01-modularizacao-pluto-plan.md](file:///p:/workspace/IA/hestia/.agents/plans/01-modularizacao-pluto-plan.md) |
| 2 | **Sistema Multi-Agentes (Olympus)** | Substitui o fluxo SDD baseado em skills sequenciais por agentes colaborativos orquestrados (Zeus, Hera, Atena, Hefesto, Minos, Argos, Mnemósine, Caronte), com estado persistente, checkpoints explícitos e execução paralela. | Em Especificação | [.agents/specs/02-multiagent-system-spec.md](file:///p:/workspace/IA/hestia/.agents/specs/02-multiagent-system-spec.md) | — |
