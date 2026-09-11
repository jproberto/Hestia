# Regressão — Hestia (transversal)

Smokes manuais promovidos de features transversais (Minos promove a partir de `test-scenarios.md`). Cada cenário ≤3 passos de caminho feliz.

## Login — entrar leva ao painel

1. Acesse `/login`, preencha email/senha e clique em "Entrar".
2. Cai em `/dashboard` ("Painel de Ferramentas").
3. Confira o card dos módulos ativos atualmente: Pluto

## Login - usuário/senha incorretos exibem mensagem

1. Acesse `/login`, preencha email/senha incorretos e clique em "Entrar".
2. Confira mensagem de erro "Email ou senha inválidos" e que o usuário permanece na tela de login.

## Autorização - acesso sem login redireciona para `/login`

1. Acesse qualquer URL do Héstia sem estar logado (ex: `/pluto/budget`).
2. Confira que o usuário é redirecionado para `/login`

## Logout — sair leva à tela de login

1. Acesse `/dashboard` e clique no ícone "Sair" (Colchete com seta para direita), localizado no topo da tela.
2. Confira que o usuário é redirecionado para `/login` e que não consegue acessar páginas internas sem logar novamente.
