# Cenários de Testes Funcionais Manuais (Regressão)

Estes cenários servem para validar manualmente o comportamento de edições e a regra do mês aberto na interface gráfica do Héstia.

---

## 1. Ajuste de Orçamento e Mês Aberto (`mockMonth`)
**Objetivo:** Validar que o parâmetro `?mockMonth=M` bloqueia edições em meses anteriores e permite em meses vigentes/futuros.

1. **Ação:** Acesse a página com o query param do mês de Maio:
   [http://localhost:3000/finance/budget?mockMonth=5](http://localhost:3000/finance/budget?mockMonth=5)
2. **Ação:** No dropdown de seleção de Mês (no cabeçalho), mude para **"Abril"** (mês 4, anterior ao mockMonth 5).
   *   **Resultado Esperado:**
       *   A etiqueta visual **"Fechado"** (vermelha) deve aparecer ao lado de "Previsões Cadastradas".
       *   O botão *"Adicionar Previsão"* no topo da tabela deve sumir.
       *   Ao passar o mouse sobre o valor planejado (ex: R$ 1000.00) na tabela, o cursor deve permanecer o padrão (sem sublinhado pontilhado) e o clique não deve abrir o campo de edição.
3. **Ação:** No dropdown de seleção de Mês, mude para **"Maio"** (mês 5, igual ao mockMonth 5).
   *   **Resultado Esperado:**
       *   A etiqueta visual muda para **"Aberto"** (verde).
       *   O botão *"Adicionar Previsão"* reaparece.
       *   Ao passar o mouse sobre o valor planejado na tabela, o cursor vira um ponteiro (com sublinhado pontilhado), permitindo a edição.
4. **Ação:** No dropdown de seleção de Mês, mude para **"Junho"** (mês 6, posterior ao mockMonth 5).
   *   **Resultado Esperado:** O mês permanece aberto para edições (comportamento idêntico ao passo anterior).

---

## 2. Edição Inline nas Células
**Objetivo:** Validar que alterações salvam automaticamente ao clicar fora (`onBlur`) ou ao pressionar `Enter`.

1. **Ação:** Com a URL configurada em `?mockMonth=5` e o mês de **Maio** selecionado.
2. **Ação:** Clique diretamente sobre o valor planejado de qualquer despesa (ex: `R$ 1000.00`).
   *   **Resultado Esperado:** A célula de valor se transforma em um input numérico com o valor focado.
3. **Ação:** Digite um novo valor (ex: `1200`) e clique em qualquer área externa da tela (`onBlur`).
   *   **Resultado Esperado:**
       *   A célula exibe opacidade temporária enquanto salva os dados no banco de dados.
       *   A célula retorna ao formato de exibição mostrando o valor atualizado `R$ 1200.00`.
       *   O resumo de "Despesas Previstas" e "Saldo Planejado" no topo da tela recalcula automaticamente para refletir o novo valor.
4. **Ação:** Clique novamente no valor da despesa, altere para outro valor (ex: `1500`) e pressione a tecla `Enter`.
   *   **Resultado Esperado:** O input fecha sem provocar recarregamento da página (a página não pisca/atualiza do zero) e exibe o novo valor atualizado.

---

## 3. Zerar e Ocultar Categoria
**Objetivo:** Validar que definir o orçamento de uma categoria como 0 a partir de um mês a remove da listagem daquele mês em diante.

1. **Ação:** Clique sobre o valor de qualquer categoria no mês de **Maio** (mês aberto).
2. **Ação:** Digite `0` e pressione `Enter` ou clique fora.
   *   **Resultado Esperado:**
       *   A categoria desaparece por completo da listagem da tabela do mês de Maio.
       *   O valor de despesas no topo da tela é recalculado.
3. **Ação:** No dropdown de seleção de Mês, mude para **"Junho"** (mês futuro).
   *   **Resultado Esperado:** A categoria zerada também não aparece em Junho.
4. **Ação:** No dropdown de seleção de Mês, mude para **"Abril"** (mês passado).
   *   **Resultado Esperado:** A categoria continua visível com o valor original em Abril (preservando o histórico passado).
