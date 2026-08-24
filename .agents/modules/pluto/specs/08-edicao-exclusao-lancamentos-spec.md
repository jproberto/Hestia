# Especificação Funcional — Feature 08: Edição e Exclusão de Lançamentos

## Contexto e Objetivo
Esta funcionalidade estende o módulo de lançamentos (Feature 05), permitindo que os usuários corrigem erros de digitação (descrição, valor, categoria, conta, tipo e data) e removam lançamentos duplicados ou equivocados.

---

## Regras de Negócio e Requisitos

### 1. Escopo de Atuação e Integridade de Períodos
- **Restrição de Status do Mês:** A alteração (edição ou exclusão) de qualquer lançamento é permitida **EXCLUSIVAMENTE** para lançamentos que pertençam a um mês com status `aberto`.
- Se o lançamento pertencer a um mês não iniciado ou já encerrado, qualquer tentativa de edição ou exclusão deve ser bloqueada.
- **Desacoplamento de Compras Parceladas:** Esta funcionalidade atua estritamente sobre lançamentos individuais existentes na tabela de transações. No futuro, quando a Feature 07 (Compras Parceladas) for desenvolvida, a rotina de abertura de mês gerará parcelas como transações individuais normais, tornando-as passíveis de edição ou exclusão pontual por esta mesma funcionalidade.

### 2. Edição de Lançamentos
- **Validação de Data:** O campo de data no formulário de edição deve ficar estritamente restrito aos limites de data do mês que está sendo visualizado na tela (por exemplo, se o usuário estiver visualizando Julho/2026, a data só poderá ser definida entre 01/07/2026 e 31/07/2026). Não é permitido alterar a data para um mês diferente.
- **Campos Editáveis:** Descrição, valor, tipo (receita ou despesa), indicação de estorno/reembolso, data (dentro do mês), categoria e conta financeira.
- **Reutilização de Componentes:** O formulário de edição compartilha a mesma estrutura visual e validações do formulário de criação de transações, vindo pré-preenchido com os dados atuais do lançamento selecionado.

### 3. Exclusão de Lançamentos
- **Confirmação Obrigatória:** A ação de exclusão exige confirmação explícita do usuário por meio de um diálogo de confirmação (modal).
- **Conteúdo da Confirmação:** O modal de confirmação deve exibir claramente a descrição e o valor formatado do lançamento a ser removido (ex: *"Tem certeza que deseja excluir a transação 'Mercado' de R$ 150,00?"*).
- **Ações Disponíveis:** Botão neutro de cancelamento e botão de destaque para confirmação da exclusão.

### 4. Atualização de Dados e Feedback
- Após a conclusão da edição ou exclusão com sucesso, os dados na tela (lista de transações e totais do mês) devem ser atualizados imediatamente.
- Uma mensagem de confirmação (toast/alerta amigável) deve notificar o usuário do sucesso da operação.

---

## Jornada do Usuário e Experiência de Uso (UX)

1. **Acesso:** Na tela de lançamentos (`/pluto/transactions`), cada linha da tabela de transações do mês aberto possui uma coluna de "Ações".
2. **Fluxo de Edição:**
   - O usuário clica no ícone de edição (Lápis).
   - O modal de lançamento abre preenchido com os dados da transação.
   - O usuário altera os dados desejados e clica em salvar.
   - As validações de campo e período são executadas.
   - O modal fecha, a lista é atualizada e um aviso de sucesso é exibido.
3. **Fluxo de Exclusão:**
   - O usuário clica no ícone de exclusão (Lixeira).
   - O modal de confirmação abre exibindo o nome e valor do lançamento.
   - O usuário clica em "Excluir".
   - A exclusão é processada no banco de dados.
   - O modal fecha, a lista atualiza e o aviso de confirmação é exibido.

---

## Critérios de Aceite

1. **Validação de Período Aberto:**
   - Dado que exista um lançamento em um mês aberto, a edição e a exclusão devem ser permitidas.
   - Dado que um mês esteja encerrado ou não aberto, a edição e a exclusão devem ser bloqueadas.
2. **Validação de Data no Modal:**
   - Não deve ser possível selecionar uma data fora do intervalo do mês atualmente exibido na tela, tanto no formulário de inclusão quanto no de edição.
3. **Modal de Confirmação de Exclusão:**
   - Clicar no botão de exclusão de um lançamento deve exibir obrigatoriamente o modal de confirmação apresentando o nome e o valor do item.
   - Cancelar a exclusão fecha o modal sem alterar o banco de dados.
   - Confirmar a exclusão remove a transação do banco de dados e atualiza a tela.
4. **Recálculo e Atualização da Interface:**
   - Qualquer edição ou exclusão deve refletir imediatamente na listagem de lançamentos e na soma de totais do mês.
