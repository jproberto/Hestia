# Héstia — Controle Financeiro Familiar

![CI](https://github.com/jproberto/Hestia/actions/workflows/ci.yml/badge.svg)

Héstia é uma ferramenta pessoal para controle de finanças e planejamento orçamentário para uma família.

## Funcionalidades Principais

* **Orçamento Anual por Categoria:** Planejamento anual de receitas e despesas por categoria (`/pluto/budget`).
* **Ajustes Orçamentários:** Revisões de metas orçamentárias com vigência a partir do mês em que são criadas.
* **Meses e Períodos Operacionais:** Controle explícito de abertura e encerramento de meses para lançamentos (`/pluto/months`).
* **Cadastro de Transações:** Lançamento de receitas e despesas com criação inline de contas e categorias, estornos/reembolsos, saldo do mês em destaque e restrição de mês aberto (`/pluto/transactions`).
* **Checklist de Contas a Pagar/Receber:** Lista recorrente de compromissos financeiros com indicação visual de urgência e validação de orçamento por categoria (`/pluto/transactions`, cards de checklist).
* **Biblioteca de Exercícios (Mílon):** Cadastro compartilhado do casal (nome + músculo + link de vídeo opcional) com filtro por músculo, busca por texto, lotes com mostrar mais e modal único criar/editar (`/milon/exercises`).
* **Programas (Mílon):** Agrupa treinos por programa com dono, ciclo de vida `rascunho`/`ativo`/`inativo` (somente um ativo por dono, ativação com confirmação e guarda), filtros por dono/status, página de detalhe e navegação em abas entre Exercícios e Programas (`/milon/programs`).
* **Treinos + séries planejadas (Mílon):** Dentro de um Programa, treinos com nome obrigatório/único e sugestão automática (`Treino A…Z, AA, AB…`), subtítulo derivado dos músculos e ordem de criação; no treino, exercícios reordenáveis por arrastar e soltar com séries planejadas (quantidade obrigatória, reps/tempo/carga/descanso nascendo vazios, vazio ≠ 0, unidade kg/libra por exercício, "aplicar a todas"); ativação do programa liberada com conteúdo mínimo (`/milon/programs/[id]`, `/milon/programs/[id]/workouts/[workoutId]`).
* **Treino do Dia v1 (Mílon):** Primeira aba do módulo (`/milon/today`; `/milon` redireciona para ela) exibindo o primeiro treino do programa ativo do dono com edição total igual à manutenção (mesma seção compartilhada, troca restrita aos treinos do programa ativo, vazios orientadores sem erro); casca pronta para execução/timer/encerramento nas features #5/#6/#7.

### Funcionalidades Recentes (0.7.0)

* **Saldo do Mês em Destaque:** Banner na página de lançamentos que exibe a diferença entre receitas e despesas do período, com cores condicionais — verde para saldo positivo, vermelho para déficit — oculto quando nenhum mês está aberto.
* **Overflow Orçamentário em Checklist:** Validação automática de estouro ao incluir ou editar itens globais, bloqueando a gravação e oferecendo fluxo guiado para ajuste do orçamento mensal.
* **Banners de Orçamento Excedido:** Indicadores visuais (rose-900 sobre rose-50) que aparecem quando o total previsto de itens pontuais excede o orçamento planejado da categoria.
* **Edição Global com Mudança de Categoria:** Ao mudar o `category_id` de um item global, a verificação de overflow utiliza o amount existente contra a nova categoria, permitindo ou bloqueando conforme o limite da categoria destino.

## Estrutura do Projeto

O Héstia é um **guarda-chuva de sub-sistemas** organizado pelo padrão *módulo por camada*: código exclusivo de um módulo vive em `<camada>/<modulo>/`; o compartilhado permanece na raiz da camada.

* **Módulo Pluto (financeiro):** `app/pluto/`, `components/pluto/`, `lib/pluto/` (com acesso a dados em `lib/pluto/db/`) e testes espelhados em `__tests__/app/pluto/`, `__tests__/components/pluto/` e `__tests__/lib/pluto/`.
* **Módulo Mílon (academia):** `app/milon/`, `components/milon/`, `lib/milon/` (com acesso a dados em `lib/milon/db/`) e testes espelhados em `__tests__/app/milon/`, `__tests__/components/milon/` e `__tests__/lib/milon/`.
* **Comum/transversal:** `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/login/`, `app/dashboard/`, `components/ui/`, `lib/utils.ts`, `utils/supabase/` e `utils/migrations/`.

O **Pluto** é o módulo financeiro do Héstia e o primeiro a seguir esse padrão; novos módulos são registrados na tabela "Módulos Registrados" do backlog central (`.agents/modules/hestia/backlog.md`) com documentação por feature em `.agents/modules/<modulo>/<slug>/` (`spec.md`, `plan.md`, `tasks.json`, `context.json`, `checkpoint.json`).

### Camadas e padrão de código

Mapa normativo em `AGENTS.md` ("Mapa de Camadas"): UI (`app/`, `components/`) consome via `hooks/*` + barrels `lib/<modulo>/db/*`; dados e regras de persistência em `lib/<modulo>/repositories/` via `IDatabaseClient`; tipos só em `lib/<modulo>/types.ts`; validação de input nos forms. Novo módulo via `node .agents/scripts/new-module.js <key> "<Nome>" "/mascots/<key>.png" "#cor"` — gera árvore que compila, testa (contracts+fakes) e documenta (story).

### Arquitetura de Agentes (Olympus)

Orquestração multi-agentes via `.agents/olimpo/` (8 agentes com frontmatter `mode/color/temperature/permission` + anti-hallucination):

* **Zeus** (primary): state machine 9 fases + guardian nativo; delega via Task tool (plataforma trata timeout/retry); persiste estado via `read`/`write`.
* **Hera** → spec, **Atena** → plan+tasks, **Hefesto** (só implementa, nunca testa) + **Minos** (contratos RED + suite + coverage ≥80% + `test-scenarios.md` → `regression.md`), **Argos** → review 5 eixos, **Mnemósine** → docs, **Caronte** → único que commita (bash + `git_retry` 3× para remoto).
* Estado por feature: `FEATURE_DIR=.agents/modules/<modulo>/<slug>/` + ponteiro `.agents/current`; histórico permanente após `COMMITTED`; skills legadas em `.agents/archive/`.

## Como Executar

1. Instale as dependências:
    ```bash
    npm install
    ```

2. Execute o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
    Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

3. Executar os testes automatizados:
    ```bash
    npm run test
    ```

4. Executar o linter e o compilador TypeScript:
    ```bash
    npx eslint .
    npx tsc --noEmit
    ```

### Fluxo de Desenvolvimento (Olympus)

O ciclo é orquestrado por **Zeus** via conversa — não há CLI externo. Exemplo:

```
Você: "Quero adicionar página de configurações do usuário"
Zeus: cria FEATURE_DIR, invoca Hera → brainstorming → spec.md
Você: aprova spec → Zeus invoca Atena → plan.md + tasks.json
Zeus: loop Minos (teste RED) → Hefesto (GREEN) → Caronte commit por task
Zeus: Minos suite completa → Argos review → você testa cenários manuais
Zeus: Mnemósine atualiza docs → Caronte commit final + push (PR via Actions)
```

Checkpoints humanos (via conversa com Zeus):
- `approve-spec` — após Hera entregar `spec.md`
- `approve-review` — após Argos aprovar + você executar `test-scenarios.md`
