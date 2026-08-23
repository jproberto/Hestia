# Héstia — Controle Financeiro Familiar

Héstia é uma ferramenta pessoal para controle de finanças e planejamento orçamentário para uma família.

## Funcionalidades Principais

* **Orçamento Anual por Categoria:** Planejamento anual de receitas e despesas por categoria (`/pluto/budget`).
* **Ajustes Orçamentários:** Revisões de metas orçamentárias com vigência a partir do mês em que são criadas.
* **Meses e Períodos Operacionais:** Controle explícito de abertura e encerramento de meses para lançamentos (`/pluto/months`).
* **Cadastro de Transações:** Lançamento de receitas e despesas com criação inline de contas e categorias, estornos/reembolsos, saldo do mês em destaque e restrição de mês aberto (`/pluto/transactions`).
* **Checklist de Contas a Pagar/Receber:** Lista recorrente de compromissos financeiros com indicação visual de urgência e validação de orçamento por categoria (`/pluto/transactions`, cards de checklist).

### Funcionalidades Recentes (0.7.0)

* **Saldo do Mês em Destaque:** Banner na página de lançamentos que exibe a diferença entre receitas e despesas do período, com cores condicionais — verde para saldo positivo, vermelho para déficit — oculto quando nenhum mês está aberto.
* **Overflow Orçamentário em Checklist:** Validação automática de estouro ao incluir ou editar itens globais, bloqueando a gravação e oferecendo fluxo guiado para ajuste do orçamento mensal.
* **Banners de Orçamento Excedido:** Indicadores visuais (rose-900 sobre rose-50) que aparecem quando o total previsto de itens pontuais excede o orçamento planejado da categoria.
* **Edição Global com Mudança de Categoria:** Ao mudar o `category_id` de um item global, a verificação de overflow utiliza o amount existente contra a nova categoria, permitindo ou bloqueando conforme o limite da categoria destino.

## Estrutura do Projeto

O Héstia é um **guarda-chuva de sub-sistemas** organizado pelo padrão *módulo por camada*: código exclusivo de um módulo vive em `<camada>/<modulo>/`; o compartilhado permanece na raiz da camada.

* **Módulo Pluto (financeiro):** `app/pluto/`, `components/pluto/`, `lib/pluto/` (com acesso a dados em `lib/pluto/db/`) e testes espelhados em `__tests__/app/pluto/`, `__tests__/components/pluto/` e `__tests__/lib/pluto/`.
* **Comum/transversal:** `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/login/`, `app/dashboard/`, `components/ui/`, `lib/utils.ts`, `utils/supabase/` e `utils/migrations/`.

O **Pluto** é o módulo financeiro do Héstia e o primeiro a seguir esse padrão; novos módulos são registrados na tabela "Módulos Registrados" do backlog central (`.agents/backlog.md`) com sua documentação em `.agents/<modulo>/`.

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
