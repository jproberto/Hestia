# Spec: Página de Login e Proteção de Rotas

## Problema

O Hestia ainda não possui autenticação. Qualquer pessoa pode acessar todas as rotas da aplicação. Membros da família precisam de uma forma segura de entrar com credenciais pré-cadastradas e acessar uma área restrita.

## Decisão Tomada

Implementar login com email e senha via **Supabase Auth**, proteção global de rotas com **Next.js Middleware** e **`@supabase/ssr`**, conforme padrão oficial Supabase + Next.js App Router.

**Alternativas rejeitadas:**

- **Guard client-side (`useEffect`):** rejeitada por permitir flash de conteúdo protegido e exigir check manual em cada rota.
- **Layout server-side por route group:** rejeitada porque o requisito é proteger todas as rotas exceto `/login`, incluindo `/` e futuras rotas sem lembrar de adicionar ao grupo.

## Comportamento Esperado

### Login (`/login`)

- Exibe formulário com campos **email** (obrigatório, `type="email"`) e **senha** (obrigatório, `type="password"`) e botão **Entrar**.
- Ao submeter credenciais válidas de um usuário pré-cadastrado no Supabase: redireciona para `/dashboard`.
- Ao submeter credenciais inválidas: exibe mensagem *"Email ou senha inválidos"* abaixo do formulário e permanece em `/login`.
- Durante submissão: botão desabilitado para evitar envios duplicados.

### Regras de redirecionamento

| Situação | Destino |
|---|---|
| Não autenticado acessa qualquer rota ≠ `/login` | `/login` |
| Autenticado acessa `/login` | `/dashboard` |
| Autenticado acessa `/` | `/dashboard` |
| Não autenticado acessa `/` | `/login` |
| Login bem-sucedido | `/dashboard` |

### Dashboard (`/dashboard`)

- Página placeholder acessível apenas por usuários autenticados.
- Exibe título "Dashboard" e mensagem indicando área autenticada. Sem funcionalidade adicional nesta entrega.

### Proteção de rotas (`middleware.ts`)

- Única rota pública: `/login`.
- Todas as demais rotas exigem sessão Supabase válida (cookie).
- Middleware renova/lê sessão via `@supabase/ssr` a cada request.

## Arquitetura

```
middleware.ts                    → gatekeeper: verifica sessão, aplica redirecionamentos
utils/supabase/
  client.ts                      → cliente browser (formulário de login)
  server.ts                      → cliente server (Server Components)
  middleware.ts                    → helper de refresh de sessão no middleware
app/login/
  page.tsx                       → página de login (Server Component)
  login-form.tsx                 → formulário interativo (Client Component)
app/dashboard/
  page.tsx                       → placeholder pós-login
app/page.tsx                     → conteúdo substituído ou redirect (middleware cobre `/`)
.env.local.example               → template de variáveis Supabase
```

**Dependência nova:** `@supabase/ssr` (não presente no `package.json` atual).

**Componentes UI:** adicionar `Input` e `Label` do Shadcn para o formulário, reutilizando `Button` existente.

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- `.env.local.example` versionado no repositório.
- `.env.local` permanece no `.gitignore` (valores reais fora do controle de versão).

## Restrições

- Usuários são criados manualmente no painel Supabase; não há fluxo de cadastro na aplicação.
- Senhas e tokens não aparecem em logs ou mensagens de erro detalhadas ao usuário.
- Mensagem de erro genérica em falha de login (não revelar se email existe ou não).

## Fora de escopo (v1)

- Cadastro/registro de usuários
- Logout
- Recuperação de senha
- OAuth / login social
- "Lembrar-me"
- Conteúdo funcional no dashboard

## Riscos

- **Middleware mal configurado:** pode causar loop de redirect ou bloquear assets estáticos. Mitigação: seguir template oficial Supabase e excluir `_next/static`, `_next/image` e arquivos com extensão do matcher.
- **Variáveis de ambiente ausentes:** app falha silenciosamente ou com erro genérico. Mitigação: documentar no `.env.local.example` e validar presença no client.

## Critérios de aceite

1. Dado um usuário pré-cadastrado no Supabase com credenciais válidas, ao preencher email e senha e clicar "Entrar", o usuário é redirecionado para `/dashboard`.
2. Dado credenciais inválidas, ao submeter o formulário, a mensagem "Email ou senha inválidos" aparece e o usuário permanece em `/login`.
3. Dado um usuário não autenticado, ao acessar `/`, `/dashboard` ou qualquer rota que não seja `/login`, é redirecionado para `/login`.
4. Dado um usuário autenticado, ao acessar `/login`, é redirecionado para `/dashboard`.
5. Dado um usuário autenticado, `/dashboard` exibe o conteúdo placeholder.
6. Dado um usuário não autenticado, `/dashboard` não exibe conteúdo — redireciona para `/login` antes da renderização.
