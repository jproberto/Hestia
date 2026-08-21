# Héstia — Controle Financeiro Familiar

Héstia é uma ferramenta pessoal para controle de finanças e planejamento orçamentário para uma família.

## Funcionalidades Principais

* **Orçamento Anual por Categoria:** Planejamento anual de receitas e despesas por categoria (`/finance/budget`).
* **Ajustes Orçamentários:** Revisões de metas orçamentárias com vigência a partir do mês em que são criadas.
* **Meses e Períodos Operacionais:** Controle explícito de abertura e encerramento de meses para lançamentos (`/finance/months`).
* **Cadastro de Transações:** Lançamento de receitas e despesas com criação inline de contas e categorias, estornos/reembolsos e restrição de mês aberto (`/finance/transactions`).
* **Checklist de Contas a Pagar/Receber:** Lista recorrente de compromissos financeiros com indicação visual de urgência e validação de orçamento por categoria (`/finance/transactions`, cards de checklist).

### Funcionalidades Recentes (0.7.0)

* **Overflow Orçamentário em Checklist:** Validação automática de estouro ao incluir ou editar itens globais, bloqueando a gravação e oferecendo fluxo guiado para ajuste do orçamento mensal.
* **Banners de Orçamento Excedido:** Indicadores visuais (rose-900 sobre rose-50) que aparecem quando o total previsto de itens pontuais excede o orçamento planejado da categoria.
* **Edição Global com Mudança de Categoria:** Ao mudar o `category_id` de um item global, a verificação de overflow utiliza o amount existente contra a nova categoria, permitindo ou bloqueando conforme o limite da categoria destino.

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
