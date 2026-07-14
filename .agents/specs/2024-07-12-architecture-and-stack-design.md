# Hestia - Arquitetura e Tech Stack

## 1. Visão Geral

Este documento descreve a arquitetura inicial e a stack de tecnologia para o projeto Hestia, uma ferramenta pessoal para controle de finanças e lista de tarefas para uma família.

**Requisitos Principais:**
- **Custo:** Gratuito para baixo volume de uso pessoal/familiar.
- **Acesso:** Primariamente via desktop, com acesso funcional via browser em dispositivos móveis.
- **Manutenibilidade:** A stack deve ser moderna, produtiva e permitir crescimento futuro.

## 2. Decisões de Arquitetura e Tecnologia

Após análise de alternativas e trade-offs, a seguinte stack foi selecionada:

### 2.1. Backend: Supabase

- **Plataforma:** Supabase será usado como o "Backend as a Service" (BaaS).
- **Componentes:**
    - **Banco de Dados:** PostgreSQL, gerenciado pelo Supabase.
    - **Autenticação:** Supabase Auth para gerenciamento de usuários.
    - **APIs:** APIs REST e GraphQL geradas automaticamente pelo Supabase a partir do schema do banco de dados.
    - **Storage:** Supabase Storage para eventual armazenamento de arquivos (ex: comprovantes).
- **Justificativa:** Supabase oferece um "free tier" generoso, acelera o desenvolvimento com suas APIs prontas e, crucialmente, usa PostgreSQL padrão, garantindo a portabilidade dos dados caso uma migração seja necessária no futuro.

### 2.2. Frontend: Next.js (React)

- **Framework:** Next.js.
- **Linguagem:** TypeScript, para garantir segurança de tipos e melhor manutenibilidade.
- **Justificativa:** Next.js é um framework robusto e popular para React, com excelente suporte para renderização no servidor (SSR) e integração com a Vercel. TypeScript adiciona uma camada de segurança e clareza ao código.

### 2.3. UI & Estilização: Tailwind CSS

- **Framework CSS:** Tailwind CSS.
- **Biblioteca de Componentes:** A ser definido, mas com preferência para bibliotecas "headless" como **Shadcn/UI**, que se integram bem com Tailwind e são altamente customizáveis.
- **Justificativa:** Tailwind CSS permite a criação rápida de interfaces customizadas sem sair do HTML/JSX. Combinado com uma biblioteca de componentes, acelera a construção da UI.

### 2.4. Hospedagem (Deployment)

- **Frontend:** Vercel. A Vercel é a criadora do Next.js e oferece integração perfeita e um "free tier" ideal para hospedar a aplicação frontend.
- **Backend:** Supabase (conforme já definido).

## 3. Resumo da Stack

- **Linguagem:** TypeScript
- **Framework Frontend:** Next.js
- **UI:** Tailwind CSS
- **Backend & Banco de Dados:** Supabase (com PostgreSQL)
- **Hospedagem:** Vercel (Frontend) + Supabase (Backend)

## 4. Próximos Passos

Com a arquitetura e a stack definidas, o próximo passo é criar um plano de implementação (`sdd-02-plan`) para configurar a estrutura inicial do projeto (scaffolding).
