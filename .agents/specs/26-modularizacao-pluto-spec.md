# 26 — Modularização: módulo Pluto

## Problema

O Héstia cresceu tratado como um sistema único, mas passará a ser um guarda-chuva de sub-sistemas. Hoje não existe fronteira real entre o que é domínio financeiro e o que é infraestrutura compartilhada: a convenção "finance" existe apenas em rotas e componentes, enquanto a lógica de domínio vive solta em `lib/db/` e toda a documentação se mistura em `.agents/`. Sem uma fronteira clara, o próximo módulo nasceria contaminado pelo domínio financeiro.

## Decisão

Estabelecer o padrão **módulo por camada**: dentro de cada namespace da raiz, tudo que for exclusivo de um módulo entra na subpasta `<camada>/<modulo>/`; o que for compartilhado permanece na raiz da camada. O módulo financeiro chama-se **Pluto** e é o primeiro a seguir o padrão.

Alternativas consideradas e rejeitadas:

- **Pasta única `pluto/` na raiz** (código + docs juntos): autocontenção máxima, mas exigiria rotas finas em `app/` apenas para satisfazer o Next.js, criando indireção desnecessária.
- **Migração para `src/`** (`src/app`, `src/modules/pluto`): mistura duas refactorações grandes no mesmo ciclo sem ganho funcional.
- **Monorepo com workspaces** (`apps/web`, `modules/pluto`): resolve independência de deploy/versionamento, problema que não existe hoje (motivação é organização preventiva).

## Estrutura-alvo

```
hestia/
├── app/
│   ├── layout.tsx · page.tsx · globals.css      # comuns
│   ├── login/ · dashboard/                      # núcleo Héstia
│   └── pluto/                                   # páginas do módulo
│       ├── budget/page.tsx                      # /pluto/budget
│       ├── months/page.tsx                      # /pluto/months
│       └── transactions/page.tsx                # /pluto/transactions
├── components/
│   ├── ui/                                      # design system (comum)
│   └── pluto/                                   # ChecklistCard, BudgetOverflowModal
├── lib/
│   ├── utils.ts                                 # helpers genéricos (comum)
│   └── pluto/
│       ├── checklist-budget.ts
│       └── db/                                  # acesso a dados do módulo
│           accounts|budget|categories|checklist|months|transactions.ts
├── __tests__/
│   ├── app/pluto/ · components/pluto/ · lib/pluto/   # testes espelham as camadas
├── utils/
│   ├── supabase/                                # infra auth/db (comum)
│   └── migrations/                              # migrations centralizadas (comum)
└── .agents/
    ├── AGENTS.md · skills/ · scripts/           # processo transversal (comum)
    ├── backlog.md                               # índice central de módulos + itens estruturais
    ├── specs/ · plans/ · logs/                  # artefatos estruturais/transversais
    └── pluto/                                   # documentação do módulo
        ├── backlog.md                           # itens 1–25 migram para cá
        ├── specs/ · plans/ · logs/              # histórico migra via git mv
```

## Regras do padrão

1. Código específico de módulo → `<camada>/<modulo>/` nas camadas `app`, `components`, `lib` e `__tests__`.
2. Documentação específica de módulo → `.agents/<modulo>/{backlog.md, specs/, plans/, logs/}`.
3. Artefatos transversais (estruturais, multi-módulos) → raiz de `.agents/` e registrados no backlog central.
4. Banco de dados: um único projeto Supabase; `utils/migrations/` permanece central; schemas e tabelas NÃO são renomeados.
5. O backlog central mantém: contexto geral do produto-guarda-chuva, tabela de módulos registrados (nome, pasta, link do backlog) e itens estruturais. Itens de domínio migram para o backlog do módulo preservando IDs, status e descrições.

## Comportamento esperado

### Código

- Rotas renomeadas de `/finance/*` para `/pluto/*` (budget, months, transactions). As URLs antigas deixam de existir (sem redirect); bookmarks externos podem quebrar — aceito por ser ferramenta pessoal com 2 usuários.
- Páginas movem-se integralmente para `app/pluto/` (não há arquivos finos de reexport).
- Componentes de `components/finance/` → `components/pluto/`.
- Lógica de `lib/checklist-budget.ts` e `lib/db/{domínio}` → `lib/pluto/` e `lib/pluto/db/`, mantendo os nomes de arquivo atuais.
- Testes existentes migram para `__tests__/<camada>/pluto/` espelhando a nova origem dos arquivos testados.
- Imports atualizados mecanicamente (`@/finance...` → `@/pluto...`, `@/lib/db/x` → `@/lib/pluto/db/x` etc.), incluindo o card do dashboard, que passa a apontar para `/pluto/budget` e exibir o nome "Pluto".
- Nenhum comportamento funcional é alterado: mesmas regras, mesmos dados, mesmas telas — apenas caminhos e URLs mudam.

### Documentação

- Specs, planos e logs históricos das features financeiras migram via `git mv` para `.agents/pluto/specs|plans|logs/` (preserva autoria no histórico git).
- Todo link cruzado entre documentos e no backlog é atualizado para os novos caminhos.
- O conteúdo financeiro do backlog central (blocos 1–5, V2, V3) torna-se `.agents/pluto/backlog.md`, preservando estrutura de blocos, IDs, status, links de specs/planos e notas.
- O backlog central ganha a tabela de módulos registrados (Pluto = módulo 1) e mantém o item 26 como item estrutural.
- AGENTS.md, README.md e CHANGELOG.md são atualizados: novo mapa de estrutura, novas URLs e registro da modularização.
- Convenções nos SKILL.md que citam caminhos de specs/plans/backlog são ajustadas para descrever o padrão por módulo (`.agents/<modulo>/specs/`), mantendo a raiz de `.agents/` para itens transversais.

### Tooling (sdd.js)

- O CLI passa a resolver specs, planos e status de backlog tanto na raiz de `.agents/` quanto dentro de `.agents/<modulo>/`, de forma que `start`, guardian, task-* e request-review funcionem para features de qualquer módulo.
- A resolução do módulo usa a tabela de módulos do backlog central como registro (nome da pasta + localização do backlog).

## Estados de erro / riscos

- **Link interno quebrado** após migração dos docs: mitigado por atualização sistemática de todos os cross-links e varredura final por referências a `/finance` e caminhos antigos.
- **Import esquecido**: mitigado por `tsc --noEmit`, eslint e suíte de testes verdes, além de grep final auditando resquícios de "finance" em caminhos de código.
- **Regressão no sdd.js**: mitigada por smoke test manual do fluxo (guardian/start/task-complete) apontando para um artefato dentro de `.agents/pluto/`.
- **Perda de histórico git**: evitada pelo uso de `git mv` (em vez de delete+create).

## Fora de escopo

- Renomear tabelas, colunas ou schemas do Supabase.
- Redirects de `/finance/*` para `/pluto/*`.
- Criar qualquer segundo módulo ou scaffolding genérico de módulos.
- Migração para `src/`, monorepo, workspaces ou separação de deploy/banco por módulo.
- Qualquer alteração de regra de negócio, layout ou comportamento das telas existentes.

## Quebra limpa (sem convivência com legado)

A migração é completa e imediata — não existe período de transição, compatibilidade ou deprecação:

- **Sem redirects nem aliases**: as URLs `/finance/*` deixam de existir no mesmo commit da mudança.
- **Sem arquivos-ponte**: nenhum reexport, wrapper ou shim mantém os caminhos antigos vivos.
- **Resolução única no CLI**: o `sdd.js` passa a enxergar somente o novo mapa (raiz transversal + `.agents/<modulo>/`); não há suporte dual aos layouts antigos além do que o próprio padrão define.
- **Nada sobra fora do padrão**: qualquer artefato (código, teste, doc ou configuração) que referencie caminhos ou URLs antigas ao final da implementação é considerado falha da migração, não exceção aceitável.

Exceção deliberada e consciente: os nomes de tabelas/colunas do banco permanecem como estão porque já são genéricos de domínio (`transactions`, `budget`, `months`...), sem qualquer marca "finance" a eliminar — renomeá-los adicionaria risco de migração de dados sem ganho organizacional algum.

## Critérios de aceite

1. Todo código específico do domínio financeiro reside exclusivamente em `app/pluto/`, `components/pluto/`, `lib/pluto/` e seus testes espelhados; nenhuma referência residual a caminhos "finance" em código.
2. As URLs `/pluto/budget`, `/pluto/months` e `/pluto/transactions` funcionam com login; navegação do dashboard leva a elas.
3. `.agents/pluto/` contém backlog (itens 1–25 com status preservados), specs, plans e logs migrados com `git mv`; links internos todos funcionais.
4. Backlog central exibe tabela de módulos (Pluto registrado) e o item 26 como estrutural; nenhum item de domínio financeiro permanece nele.
5. `sdd.js` resolve spec/plan/status de um artefato dentro de `.agents/pluto/` (smoke test do guardian aprovado).
6. `tsc --noEmit`, `eslint` e suíte de testes passam sem alteração de comportamento; os testes que permanecem na raiz são exclusivamente os de código comum (login, dashboard, design system), nunca resquícios do domínio financeiro.
7. README e CHANGELOG atualizados refletindo nova estrutura e URLs.
8. Auditoria final por busca ("finance", `/finance`, `lib/db`, `components/finance`) retorna zero ocorrências em código, testes, configurações e documentação — confirmando a quebra limpa sem legado.
