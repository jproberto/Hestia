# Regression — Módulo Mílon

Cenários promovidos pelos testes de cada feature (Minos promove a partir de `test-scenarios.md`). Cada cenário ≤3 passos de caminho feliz.

## Biblioteca — exercício persiste entre sessões

1. Acesse `/milon/exercises` (rota da biblioteca desde o Patch v3 — `/milon` agora redireciona para Programas) e confira a lista de exercícios ordenada.
2. Crie "Supino reto / Peito" via "Salvar" e confira o item na lista.
3. Recarregue a página e confira que o item continua na lista.

## Programas — criação com sugestão e persistência da lista

1. Acesse `/milon/programs` e confira a lista carregada com o dono próprio no select, os três status marcados e os itens do mais novo para o mais antigo.
2. Clique em "Novo programa", confira o título de sugestão pré-preenchido, troque o título e salve — confira o item novo na lista com título, dono e status.
3. Recarregue a página e confira que o Programa criado continua na lista.

## Programas — navegação em abas do módulo (Patch v3)

1. Acesse `/milon` e confira que termina em `/milon/programs` com a aba **Programas** destacada (aria-current="page").
2. Clique em **Exercícios**, confira `/milon/exercises` com a biblioteca e a aba **Exercícios** destacada.
3. Abra `/milon/programs` por URL direta e confira a aba **Programas** já destacada sem clique prévio.

## Programas — confirmação fecha com mensagem legível e criação navega ao detalhe (Patch v4)

1. Acesse `/milon/programs`, clique em "Novo programa", salve com um título novo e confira que a criação navega para `/milon/programs/<id>` exibindo título, dono e status.
2. Volte à lista, clique em "Ativar" em um programa sem treinos, confirme e confira que o modal de confirmação **fecha** e a mensagem aparece no corpo da página **sem** o botão "Tentar novamente".
3. Recarregue a lista com a rede simulada como falhando (DevTools offline) e confira que o banner de erro de carga exibe "Tentar novamente" e que o clique recarrega os programas.

## Programas — banner de erro ACIMA com a lista visível e retry só na carga (Patch v5 · CA-P5-1, CA-P5-3, CA-P5-5, CA-P5-6)

1. Com a rede em Offline (DevTools), confirme a exclusão de um rascunho: o modal **fecha**, a mensagem aparece em banner **acima** da lista — a lista continua visível e legível — e **não** há "Tentar novamente" (origem `operacao`).
2. Volte a Online e recarregue a lista: o banner de erro de **carga** é o único que exibe "Tentar novamente", e o clique recarrega os programas.
3. Repita o passo 1 na biblioteca (`/milon/exercises`) e confira o mesmo comportamento — modal de exclusão fecha em falha, banner acima da lista visível, sem retry.

> Preservados: os cenários **CA-P3-13…16** (bloqueio/falha fecham a confirmação com mensagem legível, retry só na carga) continuam válidos e são reexercitados pelos passos acima — a mudança do Patch v5 é de **composição** (banner acima, lista visível), não de conteúdo. Cobertos também por CA-P5-2/4 (precedência dos 4 estados e textos por props) na suíte automatizada; CA-P5-8 é handoff da fase 7 (Mnemósine) e CA-P5-9 é o gate de processo do `test-report.json`.

## Programas — título do item é link para o detalhe (Patch v6 · CA-P6-1…5)

1. Acesse `/milon/programs` e confira que o **título** de cada item da lista é um link clicável com destino `/milon/programs/<id>` daquele item (cor marrom `#B7602B` no repouso, outra tom no hover e foco visível por teclado, **sem sublinhado**).
2. Clique no título de um programa e confira que a navegação chega a `/milon/programs/<id>` exibindo título, dono e status (cabeçalho do programa).
3. Volte à lista e confira que as ações por status continuam funcionando **fora** do link (rascunho: Editar/Ativar/Excluir; ativo: Editar; inativo: Reativar) — o clique na ação dispara o modal/callback de sempre e **nunca** navega; dono e selo de status seguem texto simples.

> **Preservados (reexecutados verdes na TASK-045/CA-P6-6):** os critérios do Patch v5 seguem íntegros — **CA-P5-1…9** (banner ACIMA com lista visível, precedência dos 4 estados, retry só na carga, contrato do componente, adoção preservando CA-P3-13…16, exclusão da biblioteca fechando em falha, norma de documentação e gate de processo) — e a prova de herança **CA-P5-7** foi reexecutada em verde (seção abaixo). Os testes automatizados correspondentes: 33/33 em `__tests__/components/milon/ProgramList.test.tsx`, 176 verdes nos 8 arquivos do Patch v5 e 786/786 da suíte completa.

## Prova de herança — "Tentar novamente" só no componente centralizado (Patch v5 · CA-P5-7 — mantida no Patch v6)

1. Busque a cadeia `Tentar novamente` em `app/` e `components/` — deve retornar **1 ocorrência, somente** `components/ui/AsyncState.tsx` (zero em `ProgramList.tsx`, `ExerciseList.tsx` e em qualquer tela). *Reexecutado na TASK-045 (2026-10-01): PASS.*
2. Busque `AsyncState` em `app/pluto/` e `components/pluto/` — deve retornar **0** (Pluto intocado). *Reexecutado na TASK-045: PASS.*
3. Confira `.agents/modules/milon/02-programas/test-report.json` → bloco `inheritanceProof` com os 4 resultados `PASS`, bloco `closingSearches` do Patch v6 em verde e `summary.failed = 0`. *Regenerado na TASK-045: 786 testes, 0 falhas, coverage 84,51% lines.*
