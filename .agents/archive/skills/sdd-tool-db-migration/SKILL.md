---
name: sdd-tool-db-migration
description: Use sempre que for criar ou modificar scripts de banco de dados (DDL/DML) no Supabase. Garante que os scripts sejam salvos no diretório utils/migrations/ e contenham o registro correspondente de auditoria na tabela schema_migrations com o e-mail padrão do executor.
---

# Gerenciamento de Migrações e Scripts de Banco de Dados

## Visão Geral

Para garantir a consistência entre os ambientes de desenvolvimento e produção, todas as alterações de banco de dados (criação de tabelas, chaves, RLS, políticas, etc.) devem ser empacotadas em scripts SQL e registradas em uma tabela de controle central chamada `public.schema_migrations`.

## O Processo

### Passo 1: Salvar no Local Correto
Todos os novos scripts de migração devem ser salvos no diretório:
```text
utils/migrations/
```
Use nomes de arquivos descritivos no formato:
```text
migration-<id-da-spec>-<nome-descritivo>.sql
```

### Passo 2: Estrutura da Tabela de Controle
Certifique-se de que a tabela `schema_migrations` existe no banco. Se o script puder ser o primeiro a rodar em um banco novo, inclua seu DDL no início:
```sql
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    spec_id VARCHAR(50) NOT NULL,
    spec_name TEXT NOT NULL,
    script_name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    executed_by TEXT
);
```

### Passo 3: Registrar a Execução da Migração
Ao final de todo script SQL de migração, insira a instrução de inserção para registrar a execução do script na tabela de controle:
```sql
INSERT INTO public.schema_migrations (spec_id, spec_name, script_name, executed_by)
VALUES (
    '<ID-DA-SPEC>',
    '<NOME-DA-SPEC>',
    '<NOME-DO-SCRIPT>.sql',
    'joaopsroberto@gmail.com'
) ON CONFLICT (script_name) DO NOTHING;
```

### Passo 4: Notificação ao Usuário
Como os agentes de IA não têm acesso DDL direto ao Supabase:
1. Apresente o script SQL completo no chat para o usuário.
2. Instrua-o a colar e rodar o script no editor SQL do Dashboard do Supabase.
3. Aguarde a confirmação de execução bem-sucedida antes de prosseguir com tarefas de código de Next.js que dependam da nova estrutura.

## Lembre-se

- O e-mail padrão do executor no projeto é obrigatoriamente **`joaopsroberto@gmail.com`**.
- Nunca faça alterações locais ou propague mudanças de código Next.js que toquem no Supabase sem antes empacotar a DDL correspondente e registrá-la na tabela de controle.
- Mantenha os históricos de migrações anteriores organizados em `utils/migrations/`.
