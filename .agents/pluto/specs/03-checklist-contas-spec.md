# Especificação Funcional — Feature 03: Checklist de Contas a Pagar / Receber

## 1. Visão Geral e Problema Real

O **Checklist de Contas a Pagar / Receber** tem como objetivo fornecer um controle operacional preventivo dos compromissos financeiros recorrentes e pontuais da família no mês aberto. 

Diferente do cadastro de transações (que registra a movimentação financeira real consolidada em uma conta), o checklist atua como um lembrete visual de urgência (prazos a vencer) e como um atalho conveniente para o lançamento de transações, reduzindo o trabalho repetitivo sem criar dependências rígidas entre o planejamento operacional e o motor financeiro.

---

## 2. Modelo Conceitual de Dados

A representação conceitual utiliza a **Linguagem Ubíqua** do sistema, mantendo alinhamento estrito de terminologia com a entidade de transações já existente.

### Entidade: Item do Checklist (`checklist_items`)

- **Identificador Único (`id`):** Identificador exclusivo do item.
- **Identificador do Mês (`month_id`):** 
  - Quando **nulo**: indica que o item é um modelo global recorrente.
  - Quando **preenchido**: indica que o item pertence a um mês específico.
- **Identificador do Modelo Pai (`parent_id`):** 
  - Vincula uma instância mensal ao modelo global recorrente que a originou (opcional).
- **Dia do Vencimento (`day`):** Número inteiro de 1 a 31, representando o dia do mês em que o compromisso vence ou é esperado.
- **Descrição (`description`):** Texto explicativo do compromisso (ex: "Aluguel", "Salário", "Condomínio").
- **Tipo (`type`):** Tipo do lançamento, podendo ser `"receita"` ou `"despesa"`.
- **Categoria (`category_id`):** Referência à Categoria financeira associada ao item.
- **Valor (`amount`):** Valor previsto opcional. Se não for informado, permanece em branco.
- **Concluído (`is_completed`):** Indicador booleano de conclusão do item no mês (falso por padrão).
- **Ativo (`is_active`):** Indicador booleano de exclusão lógica (aplicável aos modelos globais; verdadeiro por padrão).
- **Auditoria:** Data de criação (`created_at`) e usuário criador (`created_by`).

---

## 3. Regras de Negócio e Comportamentos Esperados

### 3.1. Geração de Itens no Mês Aberto
1. Durante o processo de abertura de um novo mês (Feature 04), o sistema deve copiar automaticamente todos os itens do modelo global que estejam ativos (`month_id` nulo e `is_active = verdadeiro`).
2. As novas instâncias são criadas vinculadas ao mês aberto (`month_id` preenchido), registrando a referência ao modelo de origem (`parent_id`) e iniciando com o estado concluído como falso (`is_completed = falso`).
3. Para meses com menos de 31 dias (ex: fevereiro, abril, junho), se um item possuir dia de vencimento superior ao último dia do mês, o vencimento deve ser ajustado automaticamente para o último dia válido do mês correspondente.

### 3.2. Criação, Edição e Exclusão com Confirmação de Escopo
1. **Criação de Item na Tela do Mês:**
   - O usuário pode adicionar um novo item a partir da visualização do mês aberto.
   - O sistema deve solicitar a escolha do escopo:
     - **Apenas neste mês:** O item é criado apenas com o `month_id` do mês atual (item avulso, `parent_id` nulo).
     - **No modelo global:** O sistema cria o modelo global (`month_id` nulo, `is_active = verdadeiro`) e gera imediatamente a instância para o mês aberto atual (`parent_id` apontando para o novo modelo).
2. **Edição de Item no Mês:**
   - **Apenas neste mês:** Atualiza somente os campos da instância do mês atual.
   - **No modelo global:** Atualiza os campos da instância do mês atual e do modelo global vinculado (`id = parent_id`).
3. **Exclusão de Item no Mês:**
   - **Apenas neste mês:** Remove a instância do mês atual.
   - **No modelo global:** Executa a exclusão lógica no modelo global (`is_active = falso`) e remove a instância do mês atual. As instâncias em meses passados ou já encerrados permanecem inalteradas.

### 3.3. Código de Cores e Indicador de Urgência
Para todos os itens **não concluídos** (`is_completed = falso`) exibidos em um mês aberto:
- 🔴 **Vermelho (Vencida):** O dia do vencimento é estritamente menor que o dia atual do mês aberto.
- 🟡 **Amarelo / Laranja (Atenção / Vence em breve):** O dia do vencimento é igual ao dia atual ou faltam até 3 dias para o vencimento.
- 🟢 **Verde / Neutro (Em dia):** Faltam 4 dias ou mais para o dia do vencimento.
- 🩶 **Cinza com Texto Tachado (Concluído):** O item foi marcado como concluído (`is_completed = verdadeiro`), independente da data.

### 3.4. Atalho para Lançamento de Transação ao Marcar
1. Ao clicar no controle de marcação (checkbox/toggle) de um item do checklist:
   - O estado do item no checklist é alterado para concluído (`is_completed = verdadeiro`).
   - O sistema abre imediatamente o modal de cadastro de transação existente.
2. **Pré-preenchimento do Modal de Transação:**
   - **Tipo:** Preenchido com o tipo do item (`"receita"` ou `"despesa"`).
   - **Descrição:** Preenchida com a descrição do item do checklist.
   - **Categoria:** Preenchida com a categoria do item.
   - **Valor:** Preenchido com o valor do item (`amount`), se informado; caso contrário, fica em branco para digitação.
   - **Data:** Calculada combinando o ano/mês do mês aberto com o dia do item (`day`).
   - **Conta / Cartão:** Permanece obrigatoriamente **em branco**, exigindo seleção manual do usuário.
3. **Desacoplamento Intencional:**
   - Todos os campos no modal de transação continuam totalmente editáveis.
   - Caso o usuário **cancele ou feche** o modal de transação sem salvar, o item do checklist **permanece marcado como concluído** (o checklist é um lembrete operacional e não exige a criação da transação).
   - Se o usuário desmarcar um item do checklist (`is_completed = falso`), qualquer transação criada previamente permanece intacta no sistema (não há exclusão ou alteração em cascata).

### 3.5. Comportamento em Meses Fechados
- Em meses encerrados/fechados, a seção de checklist é exibida em modo de somente leitura.
- Não é permitida a criação, edição, exclusão ou alteração de estado (marcar/desmarcar) dos itens em meses encerrados.

---

## 4. Experiência de Uso (UX) e Layout

1. **Localização:** O checklist é exibido em um card/seção dedicado dentro da página do Mês Aberto (`app/pluto/months/[id]`), posicionado de forma visível em conjunto com o resumo do mês e a lista de transações.
2. **Ordenação:** Os itens do checklist são exibidos ordenados primariamente pelo dia de vencimento (`day` em ordem crescente) e secundariamente pela descrição.
3. **Indicador Visual de Urgência:** Cada linha exibe um selo ou indicador colorido de acordo com a faixa de urgência (Vermelho, Amarelo, Verde ou Cinza tachado).
4. **Formulário de Item:** Modal ou formulário inline simples contendo os campos: Dia, Descrição, Tipo, Categoria, Valor Previsto (opcional) e seletor de escopo ("Apenas neste mês" vs "No modelo global").

---

## 5. Critérios de Aceite

1. **Geração Automática na Abertura do Mês:** Ao abrir um mês, todos os modelos globais ativos (`is_active = verdadeiro`) devem ser clonados como itens daquele mês.
2. **Opção de Escopo:** Na criação, edição e exclusão de itens dentro de um mês, o sistema deve solicitar o escopo ("Apenas neste mês" ou "No modelo global") e executar a ação conforme escolhido.
3. **Código de Cores Fiel:** Itens vencidos devem aparecer em vermelho, itens a vencer em 0 a 3 dias em amarelo, itens com 4+ dias em verde, e itens concluídos em cinza tachado.
4. **Atalho de Transação:** Marcar um item abre o modal de transações preenchido com Tipo, Descrição, Categoria, Valor e Data, deixando a Conta em branco.
5. **Independência de Cancelamento:** Cancelar o modal de transação após marcar um item mantém o item marcado no checklist.
6. **Desmarcar Preserva Transação:** Desmarcar um item do checklist não exclui nenhuma transação existente.
7. **Modo Somente Leitura:** Meses encerrados impedem qualquer alteração no checklist.

---

## 6. Fora de Escopo

- Notificações push ou e-mails automáticos de aviso de vencimento (planejado para V2 #17).
- Vínculo rígido ou chaves estrangeiras entre `transactions` e `checklist_items`.
- Importação ou sincronização com extratos bancários.
