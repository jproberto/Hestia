---
name: sdd-04-review
description: Use ao completar tarefas, features importantes, bugfixes complexos ou antes de merge. Revisa a entrega contra spec, plano, diff, testes e constraints, priorizando bugs, regressões, requisitos ausentes, comportamento extra, lacunas de teste e riscos. Deve ser usado após cada tarefa em fluxo com subagentes e antes de declarar pronto. Não usar para corrigir os problemas encontrados — correções voltam para sdd-03-implement ou sdd-tool-debug, e o diff corrigido passa por nova review antes de seguir.
---

# Revisando Entregas

## Visão Geral

Revisar cedo e com contexto preciso. O reviewer avalia o produto do trabalho — diff, testes, comportamento — não a história da conversa que levou até ele.

**Anuncie no início:** "Estou usando a skill sdd-04-review para revisar esta entrega."

## O Processo

### Passo 1: Verificar Conformidade do Processo (Novo)

Antes de qualquer outra ação, invoque a `sdd-tool-guardian` para garantir que esta skill está sendo chamada no momento correto do fluxo.

### Passo 2: Confirmar que É Hora de Revisar

Obrigatório revisar:

- Depois de cada tarefa em fluxo com subagentes.
- Ao concluir uma feature relevante.
- Antes de merge.
- Após correção de bug complexa.

Também vale a pena revisar:

- Quando estiver travado.
- Antes de um refactor grande.
- Após mudança com risco em dados, segurança, UX ou contratos.

Nunca pule esta etapa por a mudança parecer simples — trivialidade percebida não é critério de dispensa.

### Passo 3: Reunir as Entradas

Reúna antes de avaliar:

- Descrição breve do que foi feito.
- Spec ou requisitos.
- Plano/tarefa específica.
- Diff ou lista de arquivos alterados.
- Testes executados e resultado.
- Constraints globais relevantes.

Não passe o histórico longo da sessão para o reviewer, e não diga a ele o que ignorar — isso enviesa a avaliação. Se alguma entrada essencial estiver faltando (sem diff, sem testes rodados, sem spec/plano de referência), pare e peça antes de revisar com informação incompleta.

### Passo 4: Avaliar contra a Rubrica

Avalie a entrega procurando:

- Requisito faltando.
- Comportamento extra não solicitado.
- Regressão.
- Edge case importante.
- Erro de contrato, tipo, API ou dados.
- Falha de segurança ou privacidade.
- Teste fraco, ausente, ou que testa mock em vez de comportamento.
- Código difícil de manter por acoplamento, duplicação ou responsabilidade confusa.
- Divergência entre implementação e plano.

### Passo 5: Classificar Severidade

Classifique cada achado:

- **Critical**: bloqueia uso, causa perda de dados, falha de segurança grave ou quebra requisito central.
- **Important**: precisa corrigir antes de prosseguir.
- **Minor**: pode ser registrado para depois, mas não deve ser esquecido.

### Passo 6: Reportar os Achados

Use este formato:

```markdown
## Achados

- [Important] Título
  Arquivo/linha:
  Evidência:
  Impacto:
  Correção sugerida:

## Lacunas de Teste

## Perguntas

## Avaliação

Spec: aprovado/reprovado
Qualidade: aprovado/reprovado
Pronto para prosseguir: sim/não
```

Nunca aprove sem mencionar lacunas de teste, mesmo quando todos os testes existentes passam — teste passando não é prova de que todos os requisitos foram cobertos.

### Passo 7: Agir Sobre os Achados

- **Critical**: corrija imediatamente. Volte para `sdd-03-implement` para a correção; se a causa do problema não estiver clara, use `sdd-tool-debug` para investigar antes de corrigir.
- **Important**: mesma rota de volta (`sdd-03-implement` ou `sdd-tool-debug`), mas antes de avançar para a próxima tarefa.
- **Minor**: registre no ledger/backlog do projeto — não descarte, mas não bloqueia o fechamento.
- Depois de qualquer correção de um achado Critical ou Important, **repita a review a partir do Passo 4** sobre o diff atualizado. Nunca aprove com base no diff anterior à correção.
- Se você, como reviewer, acha que um achado seu está errado depois de contestação, responda com evidência técnica — não recue só por insistência.
- Se um achado conflita com o que o próprio plano mandava fazer, não descarte o achado unilateralmente nem ignore o plano — pare e peça uma decisão humana (ver "Quando Parar e Pedir Ajuda").

### Passo 8: Fechar a Revisão

Só chegue aqui quando "Pronto para prosseguir" for **sim** no Passo 6, sem Critical ou Important em aberto.

1. **Changelog**: se o projeto mantém um `CHANGELOG.md`, adicione uma entrada para a mudança revisada, seguindo o formato já usado no arquivo — não invente um formato novo.
2. **AGENTS.md**: se a mudança revisada alterou arquitetura, convenção, estrutura de diretórios ou comando de build/teste, sinalize isso ao final da review. A atualização em si é responsabilidade da skill `sdd-writer-agents` (Modo Atualização) — não edite `AGENTS.md` diretamente aqui, para evitar duas skills escrevendo o mesmo arquivo com critérios diferentes.
3. **Commit**: a preparação de commits é responsabilidade da skill `sdd-tool-commit`, não desta. Ao final de uma review aprovada, indique que o próximo passo natural é chamar `sdd-tool-commit` — essa skill decide granularidade, escreve a mensagem e sempre pede confirmação humana antes de qualquer `push`. Não rode `git add`/`git commit` dentro da review.

### Passo 9: Melhorar o Processo (Retrospectiva)

Depois que a entrega for aprovada e antes de finalizar, faça uma pausa para refletir sobre o processo.

1.  **Identifique Falhas no Processo:** A execução da tarefa revelou alguma fraqueza em nossas skills? O plano era otimista demais? A especificação era ambígua? A revisão pegou algo que deveria ter sido evitado antes?
2.  **Proponha Melhorias:** Se uma falha foi identificada, proponha uma melhoria concreta na skill correspondente.
3.  **Execute a Melhoria:** Use a skill `sdd-writer-skills` para aplicar a melhoria imediatamente. Este é o momento de maior contexto para corrigir o processo.

Este passo garante que o sistema aprenda e melhore a cada ciclo de desenvolvimento.

## Quando Parar e Pedir Ajuda

- Achado Critical ou Important conflita diretamente com o que o plano mandava fazer — não descarte o achado nem ignore o plano por conta própria; peça decisão humana.
- Entradas essenciais incompletas (sem diff, sem resultado de testes, sem spec/plano de referência) e não é possível obtê-las.
- Divergência entre reviewer e implementador sobre a validade de um achado, sem evidência técnica que resolva de um lado — leve a decisão ao parceiro humano em vez de insistir ou ceder sem base.
- Minor pendente que depende de uma decisão de produto, não só técnica (ex: comportamento é bug ou é intencional) — registre e pergunte se isso deve bloquear o fechamento.

## Lembre-se

- O reviewer avalia o produto do trabalho, não a narrativa da conversa.
- Nunca pule review por a mudança parecer simples.
- Nunca ignore um achado Critical ou Important.
- Nunca prossiga sem re-review depois de uma correção relevante — o Passo 7 sempre volta ao Passo 4.
- Teste passando não é prova de que todos os requisitos foram atendidos; nunca aprove sem mencionar lacunas de teste.
- Correção de achados não acontece dentro desta skill — ela volta para `sdd-03-implement`/`sdd-tool-debug` e retorna para nova review.
- Fechamento não inclui rodar git — isso é `sdd-tool-commit`, chamado depois da aprovação, sempre com confirmação humana antes de `push`.
- **A revisão só termina de verdade depois da retrospectiva (Passo 9).**
