# Spec Template — Olympus

## 1. Modelo de Domínio (Obrigatório)

### Entidades
| Entidade | Campos | Relações |
|---|---|---|
| Exemplo | id, name, created_at | belongs_to Program |

### Premissas Técnicas Validadas (Obrigatório)
| Premissa | Validada com Humano? | Evidência |
|---|---|---|
| Tabela X tem coluna Y | ✅ Sim / ❌ Não | `grep -r "coluna" utils/migrations/...` |

### Cenários de Edge Case (Obrigatório)
| Cenário | Comportamento Esperado |
|---|---|
| Estado vazio | ... |
| Erro de rede | ... |
| Concorrência | ... |
| Migração legada | ... |
| Rollback | ... |

## 2. Problema Real
...

## 3. Usuários e Cenários
...

## 4. Regras de Negócio
...

## 5. Fora de Escopo (YAGNI)
...

## 6. Critérios de Aceite (Testáveis)
| # | Critério | Testável? |
|---|---|---|
| 1 | ... | ✅ Sim |

## 7. Riscos e Dependências
...

## 8. Alternativas Consideradas
| Alternativa | Trade-offs | Escolha |
|---|---|---|
| A | ... | ✅ Escolhida |