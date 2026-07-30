# Héstia — Controle Financeiro Familiar

Héstia é uma ferramenta pessoal para controle de finanças e planejamento orçamentário para uma família.

## Funcionalidades Principais

* **Orçamento Anual por Categoria:** Planejamento anual de receitas e despesas por categoria (`/finance/budget`).
* **Ajustes Orçamentários:** Revisões de metas orçamentárias com vigência a partir do mês em que são criadas.
* **Meses e Períodos Operacionais:** Controle explícito de abertura e encerramento de meses para lançamentos (`/finance/months`).
* **Cadastro de Transações:** Lançamento de receitas e despesas com criação inline de contas e categorias, estornos/reembolsos e restrição de mês aberto (`/finance/transactions`).

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
