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
