# Saldo do Mês Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

**Objetivo:** Exibir o saldo do mês (receitas totais menos despesas totais) em destaque na página de lançamentos, usando os agregadores já existentes, para que o usuário tenha immediate acesso ao resultado financeiro do período, em meses abertos ou fechados.

**Arquitetura:** Ajuste visual na página de lançamentos para tornar o saldo existente mais visível. Não há criação de nova lógica de cálculo, nem novas consultas ao banco de dados. A feature reutiliza os agregadores de receitas e despesas que já estão presentes na página, apenas mudou sua exibição e formatação.

**Tech Stack:** Next.js (App Router, React 18, React DOM), Tailwind CSS, TypeScript, Supabase, Vitest, Testing Library.

## Restrições Globais

* **Sem Nova Lógica de Cálculo:** O saldo será sempre o diferença entre os agregadores existentes de receitas e despesas. Não será criado nenhum novo TypeScript, SQL ou função de cálculo.
* **Exibição em Todos os Meses:** O saldo será exibido tanto em meses `aberto` quanto `encerrados`. Não há distinção de bloqueio baseado no status do mês.
* **Formatação BRL:** O valor será sempre formatado em reais usando o locale `pt-BR` (ex: `R$ 1.250,00`).
* **Indicador Visual:** O saldo receberá um indicador visual baseado no sinal (positivo/negativo/zero), usando estilização CSS existente ou classes Tailwind.
* **Sem Isolamento de Usuário:** O cálculo considera todas as transações lançadas no mês, sem filtro por `created_by`. Isso mantém consistência com o resto da página de lançamentos.
* **Não Consulta Adicional:** Não são feitas novas requisições ao banco de dados para obter dados do saldo. Apenas exibição do valor já presente na página.
* **Versionamento:** Atualizar a versão do projeto no `package.json` conforme convenção SemVer na última tarefa.
* **CLI de Automação:** O progresso do plano e os commits devem ser executados estritamente pelo script `.agents/scripts/sdd.js`.
* **Sem Placeholders:** Todo código proposto nas tarefas deve ser drop-in e completo.

---

### Tarefa 1: Ajuste Visual da Exibição do Saldo

**Arquivos:**
* Modificar: `app/pluto/transactions/page.tsx` (ou componente relevante de lista de lançamentos)

**Interfaces:**
* Consome: Agregadores existentes de `totalReceitas` e `totalDespesas` da página
* Produz: Elemento DOM com saldo formatado e indicador visual na UI

**Passo 1: Executar o início da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 1`

**Passo 2: Identificar local exato na página de lançamentos**
Localizar onde os agregadores de `totalReceitas` e `totalDespesas` já são exibidos no componente `page.tsx` ou similar.

**Passo 3: Envolver saldo em elemento destacado**
Adicionar container HTML/JSX ao redor do valor de saldo existente, com classe Tailwind para destaque visual.

**Passo 4: Formatar valor em BRL**
Usar formatação `Intl.NumberFormat` com locale `pt-BR` ou classe já existente no projeto para formatar `R$ X,XX`.

**Passo 5: Adicionar indicador visual**
Inserir pequeno elemento ao lado do saldo (ou cor de fundo) para indicar:
*   Valor positivo
*   Valor negativo  
*   Valor zero (`R$ 0,00`)

**Passo 5: Validar visualmente em navegador**
Confirmar que o saldo aparece com formatação correta e indicador visual em diferentes estados.

**Passo 6: Marcar a tarefa como concluída no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 1`

**Passo 7: Commit**
Run:
```bash
git add app/pluto/transactions/page.tsx
node .agents/scripts/sdd.js commit "feat: exibir saldo do mês em destaque na página de lançamentos"
```

---

### Tarefa 2: Verificação Final e Integração

**Arquivos:**
* Modificar: `app/pluto/transactions/page.tsx` (eventual ajuste fino)

**Interfaces:**
* Consome: Mesmo agregadores da Tarefa 1
* Produz: Confirmação de que a tela inteira continua funcionando sem erros

**Passo 1: Executar o início da tarefa no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-start 2`

**Passo 2: Rodar linter e typecheck**
Run: `npx eslint .` e `npx tsc --noEmit`

**Passo 3: Rodar testes automatizados**
Run: `npx vitest run` ou comando de teste do projeto

**Passo 3: Verificar se não quebra nada na página de lançamentos**
Confirmar visualmente que os totais de receitas e despesas continuam exibindo corretamente ao lado do novo saldo destacado.

**Passo 4: Marcar a tarefa como concluída no CLI do SDD**
Run: `node .agents/scripts/sdd.js task-complete 2`

**Passo 5: Commit**
Run:
```bash
git add app/pluto/transactions/page.tsx
node .agents/scripts/sdd.js commit "feat: ajuste fino de integração do saldo destacado"
```

---