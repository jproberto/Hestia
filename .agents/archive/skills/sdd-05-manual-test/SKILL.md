---
name: sdd-05-manual-test
description: Use obrigatoriamente após a aprovação técnica na fase de revisão (sdd-04-review) e antes de encerrar o plano de implementação e transicionar o backlog. Serve para documentar cenários de testes manuais complexos, guiar o parceiro humano na homologação e garantir a fidelidade visual e consistência das regras de negócio na interface do usuário (UI) real.
---

# Homologação e Testes Manuais

## Visão Geral

Testes automatizados garantem a integridade lógica de baixo nível, mas a homologação manual é o único portão capaz de validar a experiência visual, interações na UI (eventos de teclado/foco) e a coesão geral de regras complexas de negócio sob a perspectiva humana.

Esta skill formaliza a etapa de testes manuais, dividindo-os em duas frentes complementares e sustentáveis:
1.  **Cenários de Aceitação da Feature (Locais/Temporários)**: Roteiros específicos e profundos para validar a nova funcionalidade. Vivem no próprio **Plano de Implementação** daquela feature.
2.  **Smoke Tests de Regressão (Globais/Permanentes)**: Um fluxo básico e rápido de caminho feliz por módulo do sistema para garantir que nada foi quebrado por efeitos colaterais. Vivem no acervo global.

**Anuncie no início:** "Estou usando a skill sdd-05-manual-test para guiar a homologação e testes manuais."

**Onde encontrar/salvar X:** Os Smoke Tests de regressão permanente ficam em [references/manual_tests.md](file:///p:/workspace/IA/hestia/.agents/skills/sdd-05-manual-test/references/manual_tests.md).

## O Processo

### Passo 1: Obter e Formatar os Cenários da Feature
1. Extraia do **Plano de Implementação** (ou crie no plano, se ausente) os cenários detalhados de aceitação para a feature sob desenvolvimento.
2. Formate-os com foco nos **Critérios de Aceitação** em alto nível (usando Dado-Quando-Então), evitando prender-se a detalhes que mudam com frequência na UI (ex: nomes exatos de classes ou posições absolutas de botões).

### Passo 2: Apresentar o Roteiro ao Parceiro Humano
1. Apresente os cenários de aceitação da feature de forma clara e estruturada em Português.
2. Indique como preparar o ambiente local (ex: variáveis de ambiente `.env.local` ou chaves específicas do Supabase).
3. Se a feature afetar áreas preexistentes, peça também a execução do Smoke Test correspondente em [references/manual_tests.md](file:///p:/workspace/IA/hestia/.agents/skills/sdd-05-manual-test/references/manual_tests.md) para garantir que não houve regressões.
4. Aguarde o retorno com o resultado das execuções dos testes.

### Passo 3: Consolidar Feedbacks e Tratar Erros
1. Se algum cenário falhar ou trouxer desvio de comportamento visual ou de negócio:
   *   **PARE** a transição de encerramento do plano.
   *   Classifique o erro e retorne temporariamente para a skill `sdd-03-implement` ou `sdd-tool-debug` para correções técnicas.
   *   Após corrigir e validar localmente com testes automatizados, repita a revisão técnica (`sdd-04-review`) e retorne a esta skill para nova homologação.
2. Se todos os testes manuais passarem e o parceiro humano der o sinal verde: siga para o Passo 4.

### Passo 4: Promover Smoke Tests para o Acervo Permanente
1. Avalie se a nova feature exige a criação ou atualização de um **Smoke Test** simples e de alto nível (caminho feliz básico de até 3 passos) no acervo [references/manual_tests.md](file:///p:/workspace/IA/hestia/.agents/skills/sdd-05-manual-test/references/manual_tests.md).
2. Se sim, adicione a entrada enxuta sem poluir o documento com fluxos pontuais ou alternativos da feature (que já foram validados e arquivados no plano).

### Passo 5: Atualizar Documentação (Release) e Transicionar Backlog
1. Após a aprovação do parceiro humano e conclusão de todos os testes manuais e de regressão:
   *   **Invoque obrigatoriamente a skill `sdd-writer-changelog`** para inicializar ou atualizar os arquivos `CHANGELOG.md` e `README.md` com as novidades estáveis e homologadas.
   *   Verifique se o incremento de versão no `package.json` está consistente com as regras SemVer da feature.
2. Transicione o status da feature para `Concluído` no backlog correspondente (`​.agents/backlog.md` para transversais; `.agents/<modulo>/backlog.md` para módulos registrados) e comite todas as alterações de release finais.

## Quando Parar e Pedir Ajuda
- Se o parceiro humano reportar um bug visual ou de fluxo cuja correção exija alterar regras definidas no spec original — pare e discuta o impacto de arquitetura/negócio.
- Se houver divergência sobre a usabilidade ou design esperado da UI.

## Lembre-se
- Roteiros detalhados de novas features nascem e morrem no plano de implementação (são descartados/arquivados pós-merge).
- O acervo global `references/manual_tests.md` deve conter apenas Smoke Tests enxutos de regressão rápida de negócio.
- O portão de testes manuais é obrigatório antes da transição de qualquer item do backlog para Concluído.
