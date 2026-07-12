# Plano de Implementação: Configuração Inicial do Projeto Hestia

> **Para agentes:** REQUIRED SUB-SKILL: use `sdd-03-implement` para implementar este plano tarefa por tarefa.

Use checkbox (`- [ ]`) para acompanhamento. Marque com o emoji ✅ quando a tarefa estiver concluída.

**Objetivo:** Inicializar o projeto Hestia com a stack definida: Next.js (TypeScript), Tailwind CSS e Supabase.

**Arquitetura:** Um monorepo simples contendo a aplicação Next.js. A conexão com o Supabase será feita via variáveis de ambiente.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Shadcn/UI, Supabase.

## Restrições Globais

- O projeto deve ser inicializado na raiz do workspace `P:/workspace/IA/Hestia`.
- A versão do Node.js deve ser LTS.
- Todos os comandos devem ser executados a partir da raiz do projeto.

---

### Tarefa 1: Inicializar o Projeto Next.js

**Arquivos:**
- Criar: Toda a estrutura do Next.js (`package.json`, `tsconfig.json`, `next.config.js`, diretórios `app`, `public`, etc.).

**Interfaces:**
- Produz: Uma aplicação Next.js funcional com TypeScript e App Router.

- [ ] **Passo 1: Executar o `create-next-app`**
  O comando abaixo irá criar um novo projeto Next.js no diretório atual. Ele fará perguntas interativas. Use as respostas especificadas.

  **Run:**
  ```bash
  npx create-next-app@latest .
  ```

  **Respostas para o prompt interativo:**
  - `Would you like to use TypeScript?` **Yes**
  - `Would you like to use ESLint?` **Yes**
  - `Would you like to use Tailwind CSS?` **Yes**
  - `Would you like to use `src/` directory?` **No**
  - `Would you like to use App Router? (recommended)` **Yes**
  - `Would you like to customize the default import alias?` **No**

- [ ] **Passo 2: Verificar a instalação**
  Após a conclusão, verifique se o arquivo `package.json` foi criado na raiz do projeto.

  **Run:**
  ```bash
  ls package.json
  ```
  **Expected:** `package.json`

- [ ] **Passo 3: Iniciar o servidor de desenvolvimento**
  Para garantir que a instalação padrão funciona.

  **Run:**
  ```bash
  npm run dev
  ```
  **Expected:** O servidor deve iniciar com sucesso, geralmente na porta 3000, sem erros. Você pode parar o servidor (Ctrl+C) após a confirmação.

- [ ] **Passo 4: Commit inicial**
  Vamos commitar a estrutura base do projeto.

  **Run:**
  ```bash
  git add .
  git commit -m "feat: initialize project with create-next-app"
  ```

---

### Tarefa 2: Configurar Shadcn/UI

**Arquivos:**
- Criar/Modificar: `components.json`, `tailwind.config.ts`, `app/globals.css`.

**Interfaces:**
- Consome: A estrutura do Next.js e Tailwind CSS da Tarefa 1.
- Produz: Configuração base para usar os componentes do Shadcn/UI.

- [ ] **Passo 1: Inicializar o Shadcn/UI**
  Este comando irá configurar o projeto para usar Shadcn/UI. Ele também fará perguntas.

  **Run:**
  ```bash
  npx shadcn-ui@latest init
  ```

  **Respostas para o prompt interativo:**
  - `Would you like to use TypeScript (recommended)?` **Yes**
  - `Which style would you like to use?` **Default**
  - `Which color would you like to use as base color?` **Slate**
  - `Where is your global CSS file?` **app/globals.css**
  - `Would you like to use CSS variables for colors?` **Yes**
  - `Where is your tailwind.config.js located?` **tailwind.config.ts**
  - `Configure import alias for components?` **@/components**
  - `Configure import alias for utils?` **@/lib/utils**
  - `Are you using React Server Components?` **Yes**
  - `Write configuration to components.json.` **Yes**

- [ ] **Passo 2: Adicionar um componente de teste (Button)**
  Vamos adicionar um componente para garantir que a configuração funcionou.

  **Run:**
  ```bash
  npx shadcn-ui@latest add button
  ```
  **Expected:** O arquivo `components/ui/button.tsx` deve ser criado.

- [ ] **Passo 3: Commit da configuração do Shadcn/UI**

  **Run:**
  ```bash
  git add .
  git commit -m "feat: configure shadcn/ui"
  ```

---

### Tarefa 3: Instalar e Configurar o Supabase

**Arquivos:**
- Criar: `.env.local`
- Modificar: `package.json`

**Interfaces:**
- Produz: SDK do Supabase instalado e variáveis de ambiente configuradas para acesso ao backend.

- [ ] **Passo 1: Instalar as bibliotecas do Supabase**

  **Run:**
  ```bash
  npm install @supabase/supabase-js
  ```

- [ ] **Passo 2: Criar o arquivo de variáveis de ambiente**
  Este arquivo conterá as chaves de API do Supabase. **Importante:** As chaves são placeholders e precisarão ser substituídas pelas chaves reais do seu projeto Supabase.

  **Run:**
  ```bash
  touch .env.local
  ```

- [ ] **Passo 3: Adicionar as variáveis de ambiente ao `.env.local`**
  Vamos escrever o conteúdo no arquivo.

  ```bash
  # Conteúdo para .env.local
  NEXT_PUBLIC_SUPABASE_URL=SUA_URL_DO_PROJETO_SUPABASE
  NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA_SUPABASE
  ```
  **Ação:** Escreva o conteúdo acima no arquivo `.env.local`.

- [ ] **Passo 4: Adicionar `.env.local` ao `.gitignore`**
  Este arquivo nunca deve ser commitado. O `create-next-app` geralmente já o adiciona, mas vamos garantir.

  **Ação:** Verifique se a linha `.env.local` existe no arquivo `.gitignore`. Se não existir, adicione-a.

- [ ] **Passo 5: Commit da configuração do Supabase**

  **Run:**
  ```bash
  git add package.json package-lock.json .gitignore
  git commit -m "feat: add supabase client and env configuration"
  ```
