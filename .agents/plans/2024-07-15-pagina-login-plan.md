# Página de Login e Proteção de Rotas Implementation Plan

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

Use checkbox (`- [ ]`) para acompanhamento. Marque com o emoji ✅ quando a tarefa estiver concluída.

**Objetivo:** Implementar login com email/senha via Supabase Auth, proteger todas as rotas exceto `/login`, e redirecionar usuários autenticados para `/dashboard`.

**Arquitetura:** Clientes Supabase separados (browser, server, proxy helper) com `@supabase/ssr`. O arquivo raiz `proxy.ts` (convenção Next.js 16, equivalente ao `middleware.ts` da spec) renova a sessão e aplica redirecionamentos antes de renderizar rotas.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Supabase Auth (`@supabase/supabase-js`, `@supabase/ssr`).

## Restrições Globais

- Usuários pré-cadastrados manualmente no painel Supabase; sem cadastro na aplicação.
- Única rota pública: `/login`.
- Mensagem de erro genérica em falha de login: `"Email ou senha inválidos"`.
- Senhas e tokens não aparecem em logs.
- Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Fora de escopo: logout, recuperação de senha, OAuth, "lembrar-me", conteúdo funcional no dashboard.
- O projeto não possui framework de testes configurado; verificação manual via `npm run dev` + browser conforme descrito em cada tarefa.

---

### Tarefa 1: Dependências, variáveis de ambiente e componentes UI

**Arquivos:**
- Modificar: `package.json`, `package-lock.json`
- Criar: `.env.local.example`
- Modificar: `.gitignore`
- Criar: `components/ui/input.tsx`, `components/ui/label.tsx`

**Interfaces:**
- Produz: pacote `@supabase/ssr` instalado; template de env vars; componentes `Input` e `Label` importáveis de `@/components/ui/input` e `@/components/ui/label`.

- [ ] **Passo 1: Instalar `@supabase/ssr`**

Run (raiz do projeto):
```bash
npm install @supabase/ssr
```
Expected: `package.json` contém `"@supabase/ssr"` em `dependencies`; comando termina com exit code 0.

- [ ] **Passo 2: Criar `.env.local.example`**

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Passo 3: Permitir versionar o template de env**

Em `.gitignore`, substituir a linha `.env*` por:

```gitignore
.env*
!.env.local.example
```

- [ ] **Passo 4: Criar `.env.local` com credenciais reais (ação humana se ainda não existir)**

Copiar `.env.local.example` para `.env.local` e preencher com URL e anon key do projeto Supabase.

Run:
```bash
cp .env.local.example .env.local
```
Expected: arquivo `.env.local` existe (não será commitado).

Se o parceiro humano ainda não tiver projeto Supabase, criar um em https://supabase.com, ir em **Project Settings → API**, copiar **Project URL** e **anon public** key.

- [ ] **Passo 5: Adicionar componentes Shadcn Input e Label**

Run:
```bash
npx shadcn@latest add input label --yes
```
Expected: arquivos `components/ui/input.tsx` e `components/ui/label.tsx` criados.

Se o comando falhar por prompt interativo, retry com `--yes`. Se falhar por registry, executar `npx shadcn@latest add input --yes` e `npx shadcn@latest add label --yes` separadamente.

- [ ] **Passo 6: Verificar build baseline**

Run:
```bash
npm run build
```
Expected: PASS (exit code 0).

- [ ] **Passo 7: Commit**

```bash
git add package.json package-lock.json .env.local.example .gitignore components/ui/input.tsx components/ui/label.tsx
git commit -m "chore: add supabase ssr dependency and login UI components"
```

---

### Tarefa 2: Utilitários Supabase (browser, server, proxy helper)

**Arquivos:**
- Criar: `utils/supabase/client.ts`
- Criar: `utils/supabase/server.ts`
- Criar: `utils/supabase/middleware.ts`

**Interfaces:**
- Consome: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Tarefa 1).
- Produz:
  - `createClient()` em `utils/supabase/client.ts` — retorna `SupabaseClient` browser.
  - `createClient()` em `utils/supabase/server.ts` — função `async`, retorna `SupabaseClient` server.
  - `updateSession(request: NextRequest)` em `utils/supabase/middleware.ts` — retorna `Promise<{ supabaseResponse: NextResponse; user: User | null }>`.

- [ ] **Passo 1: Criar `utils/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Passo 2: Criar `utils/supabase/server.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, _headers) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component; proxy handles refresh.
          }
        },
      },
    }
  );
}
```

- [ ] **Passo 3: Criar `utils/supabase/middleware.ts`**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
```

- [ ] **Passo 4: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: PASS (exit code 0, sem erros nos arquivos criados).

- [ ] **Passo 5: Commit**

```bash
git add utils/supabase/client.ts utils/supabase/server.ts utils/supabase/middleware.ts
git commit -m "feat: add supabase client utilities for browser, server and proxy"
```

---

### Tarefa 3: Proteção de rotas com `proxy.ts`

**Arquivos:**
- Criar: `proxy.ts`

**Interfaces:**
- Consome: `updateSession(request)` de `utils/supabase/middleware.ts` (Tarefa 2).
- Produz: `proxy(request: NextRequest)` exportada de `proxy.ts` com `config.matcher`.

**Nota:** Next.js 16 renomeou `middleware.ts` → `proxy.ts`. A função exportada é `proxy`, não `middleware`.

- [ ] **Passo 1: Criar `proxy.ts` na raiz do projeto**

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

function redirectWithCookies(
  url: URL,
  supabaseResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
    redirectResponse.cookies.set(name, value);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithCookies(url, supabaseResponse);
  }

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Passo 2: Verificar redirecionamento sem sessão (manual)**

Run:
```bash
npm run dev
```

Abrir `http://localhost:3000/` no browser (sem cookies de sessão).

Expected: browser redireciona para `http://localhost:3000/login`.

Abrir `http://localhost:3000/dashboard`.

Expected: browser redireciona para `http://localhost:3000/login`.

- [ ] **Passo 3: Verificar que `/login` é acessível sem sessão**

Abrir `http://localhost:3000/login`.

Expected: página de login carrega (404 ou página vazia neste momento é aceitável — rota ainda não implementada na Tarefa 4; o importante é **não** redirecionar para outra URL).

- [ ] **Passo 4: Commit**

```bash
git add proxy.ts
git commit -m "feat: add route protection proxy with supabase session refresh"
```

---

### Tarefa 4: Página e formulário de login

**Arquivos:**
- Criar: `app/login/page.tsx`
- Criar: `app/login/login-form.tsx`

**Interfaces:**
- Consome: `createClient()` de `@/utils/supabase/client`; `Button` de `@/components/ui/button`; `Input` de `@/components/ui/input`; `Label` de `@/components/ui/label`.
- Produz: rota `/login` renderizando formulário com campos email/senha e botão "Entrar"; componente `LoginForm` client-side.

- [ ] **Passo 1: Criar `app/login/login-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email ou senha inválidos");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
```

- [ ] **Passo 2: Criar `app/login/page.tsx`**

```tsx
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Hestia</h1>
          <p className="text-sm text-muted-foreground">
            Entre com seu email e senha
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

- [ ] **Passo 3: Verificar login com credenciais inválidas (manual)**

Com `npm run dev` rodando, abrir `http://localhost:3000/login`.

Preencher email `teste@example.com` e senha `senhaerrada`, clicar **Entrar**.

Expected:
- Permanece em `/login`
- Mensagem `"Email ou senha inválidos"` visível abaixo dos campos

- [ ] **Passo 4: Verificar login com credenciais válidas (manual)**

No painel Supabase (**Authentication → Users**), confirmar que existe um usuário com email/senha conhecidos (criar um se necessário: **Add user → Create new user**).

Preencher credenciais válidas e clicar **Entrar**.

Expected: browser redireciona para `/dashboard`.

- [ ] **Passo 5: Verificar redirect de usuário autenticado em `/login` (manual)**

Com sessão ativa, navegar para `http://localhost:3000/login`.

Expected: browser redireciona para `/dashboard`.

- [ ] **Passo 6: Commit**

```bash
git add app/login/page.tsx app/login/login-form.tsx
git commit -m "feat: add login page with email and password form"
```

---

### Tarefa 5: Dashboard placeholder e ajustes finais

**Arquivos:**
- Criar: `app/dashboard/page.tsx`
- Modificar: `app/page.tsx`
- Modificar: `app/layout.tsx`

**Interfaces:**
- Consome: proteção de rotas via `proxy.ts` (Tarefa 3); login funcional (Tarefa 4).
- Produz: rota `/dashboard` com placeholder; metadata atualizada para "Hestia"; `app/page.tsx` simplificado (proxy trata redirects de `/`).

- [ ] **Passo 1: Criar `app/dashboard/page.tsx`**

```tsx
export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Você está autenticado. Esta área será expandida em breve.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Passo 2: Simplificar `app/page.tsx`**

Substituir todo o conteúdo por:

```tsx
export default function HomePage() {
  return null;
}
```

O `proxy.ts` redireciona `/` para `/login` ou `/dashboard` antes desta página ser relevante.

- [ ] **Passo 3: Atualizar metadata em `app/layout.tsx`**

Substituir o bloco `export const metadata`:

```typescript
export const metadata: Metadata = {
  title: "Hestia",
  description: "Controle de finanças e tarefas para a família",
};
```

- [ ] **Passo 4: Verificação final dos critérios de aceite (manual)**

Checklist com `npm run dev` rodando e usuário de teste no Supabase:

| # | Cenário | Expected |
|---|---|---|
| 1 | Login com credenciais válidas | Redirect para `/dashboard` |
| 2 | Login com credenciais inválidas | Mensagem de erro, permanece em `/login` |
| 3 | Não autenticado acessa `/`, `/dashboard` | Redirect para `/login` |
| 4 | Autenticado acessa `/login` | Redirect para `/dashboard` |
| 5 | Autenticado acessa `/dashboard` | Placeholder visível |
| 6 | Não autenticado acessa `/dashboard` | Redirect para `/login` (sem ver placeholder) |

- [ ] **Passo 5: Verificar build de produção**

Run:
```bash
npm run build
```
Expected: PASS (exit code 0).

- [ ] **Passo 6: Verificar lint**

Run:
```bash
npm run lint
```
Expected: PASS (exit code 0). Se houver erros apenas em arquivos desta feature, corrigi-los antes do commit.

- [ ] **Passo 7: Commit**

```bash
git add app/dashboard/page.tsx app/page.tsx app/layout.tsx
git commit -m "feat: add authenticated dashboard placeholder and update app metadata"
```

---

## Mapeamento Spec → Tarefas

| Requisito (spec) | Tarefa | Verificação |
|---|---|---|
| Login email/senha + botão Entrar | Tarefa 4 | Manual passos 3-4 |
| Redirect pós-login → `/dashboard` | Tarefa 4 passo 4 | Manual |
| Erro genérico credenciais inválidas | Tarefa 4 passo 3 | Manual |
| Botão desabilitado durante submissão | Tarefa 4 (`isLoading`) | Manual |
| Proteção global exceto `/login` | Tarefa 3 | Manual passos 2-3 |
| Autenticado em `/login` → `/dashboard` | Tarefa 3 + 4 passo 5 | Manual |
| `/` redirect login/dashboard | Tarefa 3 | Manual passo 2 |
| Dashboard placeholder | Tarefa 5 | Manual passo 4 |
| `@supabase/ssr` + utilitários | Tarefas 1-2 | `tsc --noEmit`, build |
| `.env.local.example` versionado | Tarefa 1 | Arquivo no repo |
| Componentes Input/Label Shadcn | Tarefa 1 | Import em login-form |
