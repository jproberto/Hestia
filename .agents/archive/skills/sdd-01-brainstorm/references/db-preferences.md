# Diretrizes de Modelagem de Banco de Dados (PostgreSQL / Supabase)

Este documento registra as preferências e convenções de modelagem de banco de dados para o projeto Héstia. Todos os agentes devem ler e respeitar estas diretrizes ao propor e implementar alterações de banco de dados.

## 1. Auditoria Transparente
Todas as tabelas do banco de dados (exceto quando explicitamente justificado o contrário) devem conter colunas de auditoria padronizadas:
*   `created_at`: `TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL`
*   `created_by`: `TEXT`
    *   **Importante**: Não use chaves estrangeiras para a tabela de usuários do Auth (`auth.users`) em `created_by`. Em vez disso, armazene o **e-mail do usuário autenticado** como `TEXT`. Isso garante que o histórico de auditoria permaneça legível e consistente mesmo se um usuário for futuramente removido ou desativado.

## 2. Integridade Referencial e Exclusões
*   **Bloqueio de Exclusão por Padrão (`ON DELETE RESTRICT`)**:
    *   Evite o uso de `ON DELETE CASCADE` para relações críticas (como itens de orçamento vinculados a revisões ou categorias).
    *   Prefira sempre `ON DELETE RESTRICT` (ou `ON DELETE NO ACTION`) para impedir a exclusão acidental de registros pais quando houver registros filhos que dependem deles. O usuário deve ser forçado a tratar ou remover os registros filhos antes de excluir o pai.

## 3. Isolamento e Compartilhamento de Dados
*   Como a ferramenta é projetada para o uso de uma única família onde ambos os usuários têm acesso total a tudo, as tabelas devem ser modeladas de forma global (sem necessidade de colunas de `family_id` ou isolamentos complexos adicionais no MVP), a menos que explicitamente solicitado.

## 4. Segurança de Banco de Dados (RLS)
*   As tabelas devem ter a segurança de nível de linha (RLS) habilitada no Supabase para garantir que apenas usuários autenticados possam ler ou escrever dados.
