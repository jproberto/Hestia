# Auto-Análise da Feature 5 Mílon (Execução Série a Série)

**Data:** 2026-10-10  
**Feature:** Mílon #5 — Execução Série a Série  
**Status:** Homologada e Aprovada (commit `6fe27a0`)  
**Branch:** `feature/milon/05-execucao-series`

---

## Resumo Executivo

| Métrica | Valor |
|---|---|
| **Duração** | ~3 dias de trabalho intenso |
| **Ciclos de replanejamento** | 4 grandes replanejamentos (spec v1→v2→v3, plan v1→v2→v3→v4) |
| **Migrações** | 4 criadas (0011, 0012, 0013, 0014), 1 revertida (0012-mode), 1 renumerada (0013→0012) |
| **Commits** | 12 commits de código + 4 de docs/plano |
| **Testes** | 1476 passando, 0 falhas |
| **Homologação** | 3 rodadas de feedback do usuário com correções significativas |
| **Cobertura** | 85.16% statements / 83.98% branch |

---

## Diagnóstico dos Principais Problemas

### 1. Descoberta Insuficiente (Hera/Zeus)
- **Problema:** O modelo de domínio não foi bem entendido na descoberta inicial
- **Evidência:** 3 mudanças radicais de modelo durante o desenvolvimento:
  - Snapshot congelado → template ao vivo
  - Modo/unidade na biblioteca → modo/unidade no entry do treino
  - Valor único por série (merge reps+duration_seconds)
- **Impacto:** 3 replanejamentos completos, retrabalho massivo

### 2. Validação de Premissas Técnicas Ausente (Zeus/Atena)
- **Problema:** Premissas sobre o schema existente não foram validadas antes do planejamento
- **Evidência:** 
  - Acreditava que `exercises` não tinha `load_unit` (tinha, migração 0009)
  - Acreditava que `workout_series` não tinha `reps`/`duration_seconds` (tinha, migração 0009)
  - Não sabia que `workout_execution_series` já existia (migração 0011)
- **Impacto:** Planos baseados em schema imaginário, não real

### 3. Test-First Inconsistente (Minos/Hefesto)
- **Problema:** Testes escritos após implementação em múltiplas ocasiões
- **Evidência:** 
  - TASK-011/012: Hefesto implementou antes de Minos completar RED
  - TASK-014: Hefesto bloqueado porque Minos não tinha atualizado 11 arquivos de teste
  - Múltiplas rodadas de "reconciliação" de fixtures
- **Impacto:** Ciclos de reconciliação, testes obsoletos, `tsc` errors em testes

### 4. Gestão de Migrações Caótica (Zeus/Caronte)
- **Problema:** Migrações criadas, revertidas, renumeradas sem controle claro
- **Evidência:** 0011, 0012 (mode), 0012 (entry), 0013, 0014, revert 0012-mode, renumeração 0013→0012
- **Impacto:** Confusão no dev, risco de conflito em prod

### 5. Feedback de Homologação Tardio (Zeus/Humano)
- **Problema:** Validação real do usuário só aconteceu no final
- **Evidência:** 3 rodadas de homologação com mudanças estruturais:
  - "Valor único por série" (mudou schema)
  - "lb abreviado no banco" (mudou CHECKs)
  - "Ícones Editar/Excluir" (mudou UI)
  - "Modo/unidade no entry, não na biblioteca" (mudou modelo inteiro)
- **Impacto:** Reescrita de 40%+ do código após "feature pronta"

### 6. Coordenação Sub-Agentes com Gaps (Zeus)
- **Problema:** Handoffs entre agentes deixavam gaps de especificação
- **Evidência:**
  - Hefesto implementou `useExercises.save` sem Minos ter especificado no RED
  - Hefesto implementou `ExerciseEntryCard` repasse de `exerciseMode` sem estar no plano
  - Minos não atualizou 11 arquivos de teste antes de Hefesto tentar GREEN
  - Shims transitórios deixados no código (`setExerciseLoadUnit` em `db/exercises.ts`)

### 7. Comunicação de Decisões Fragmentada (Zeus)
- **Problema:** Decisões tomadas no chat não eram imediatamente refletidas nos artefatos
- **Evidência:** Decisões sobre "valor único", "lb no banco", "ícones" tomadas no chat mas só apareceram no plano/spec depois de implementadas

---

## Pontos de Melhoria por Sub-Agente

---

### ZEUS (Orquestrador)

| # | Melhoria | Prioridade |
|---|---|---|
| Z1 | **Gate de "Descoberta Completa" antes de PLAN_READY** - Exigir que Hera valide schema real (ler migrações, types, repositórios) antes de aprovar spec | 🔴 Crítica |
| Z2 | **Gate de "Validação de Premissas Técnicas"** - Antes de PLAN_APPROVED, Zeus deve verificar se Atena leu o schema real (migrações, types, repositórios) | 🔴 Crítica |
| Z3 | **Registro Imediato de Decisões** - Toda decisão no chat deve ser imediatamente refletida em `context.json.decisions` e, se estrutural, no `plan.md` | 🔴 Crítica |
| Z4 | **Gate de "Homologação Antecipada"** - Exigir validação humana de protótipo/conceito antes de CODING (mesmo que mock) | 🟡 Alta |
| Z5 | **Controle de Migrações Centralizado** - Zeus deve manter registry de migrações no `context.json` (id, status, arquivo, aplicada_em) | 🟡 Alta |
| Z6 | **Validação de Handoff** - Checklist obrigatório antes de delegar: "O agente receptor tem tudo que precisa? O que falta?" | 🟡 Alta |
| Z7 | **Métricas de Qualidade de Processo** - Trackear: nº de replanejamentos, nº de correções em homologação, % de testes escritos antes do código | 🟢 Média |

---

### HERA (Analista/Discovery)

| # | Melhoria | Prioridade |
|---|---|---|
| H1 | **Validação Obrigatória de Schema Real** - Antes de fechar spec, Hera DEVE ler: migrações aplicadas, `types.ts`, repositórios principais, e confirmar com humano | 🔴 Crítica |
| H2 | **Modelagem de Domínio Explícita** - Spec deve incluir diagrama textual de entidades (entidade → campos → relações) validado com humano | 🔴 Crítica |
| H3 | **Validação de Premissas com Humano** - Lista de premissas técnicas ("assumo que X") deve ser apresentada e confirmada antes de fechar spec | 🔴 Crítica |
| H4 | **Cenários de Edge Case Obrigatórios** - Spec deve cobrir: estados vazios, erros, concorrência, migração de dados legados, rollback | 🟡 Alta |
| H5 | **Checklist de Completude** - Antes de `approve-spec`, Hera deve confirmar: "Todas as entidades têm campos definidos? Todas as regras de negócio têm critério de aceite? Todos os edge cases têm cenário?" | 🟡 Alta |

---

### ATENA (Arquiteta/Planejadora)

| # | Melhoria | Prioridade |
|---|---|---|
| A1 | **Leitura Obrigatória de Código Real** - Antes de escrever `plan.md`, Atena DEVE ler: migrações, `types.ts`, repositórios, hooks, componentes afetados | 🔴 Crítica |
| A2 | **Validação de Schema vs Plano** - Plan deve mapear explicitamente: "Tabela X → coluna Y → migração Z → repositório W → hook V → componente U" | 🔴 Crítica |
| A3 | **Especificação de Contratos Completos** - Plan deve definir: tipos (Row/Domain/Input), interfaces de repositório, signatures de hooks, props de componentes | 🔴 Crítica |
| A4 | **Especificação de Migração Detalhada** - Cada migração: DDL exato, backfill strategy, rollback strategy, auditoria | 🔴 Crítica |
| A5 | **Identificação de Código Legado/Removível** - Plan deve listar: o que será removido, critério de busca zerada, arquivos afetados | 🟡 Alta |
| A6 | **Tasks com Escopo Atômico e Completo** - Cada task: `files[]` exatos, `acceptanceCriteria` executáveis, `consumes`/`produces` claros | 🟡 Alta |
| A7 | **Identificação de Gaps de Escopo** - Atena deve flagar: "Este hook usa X mas X não está no plano" antes de aprovar | 🟡 Alta |

---

### MINOS (Testes)

| # | Melhoria | Prioridade |
|---|---|---|
| M1 | **RED Completo Antes de Qualquer GREEN** - Minos NÃO entrega RED até que TODOS os `files[]` da task tenham testes falhando pelo motivo certo | 🔴 Crítica |
| M2 | **Atualização Proativa de Testes Legados** - Ao detectar contrato quebrado, Minos deve atualizar TODOS os testes afetados ANTES de Hefesto tentar GREEN | 🔴 Crítica |
| M3 | **Fixtures como Código Vivo** - Fixtures devem ser versionadas e atualizadas junto com o código; fixtures obsoletas = bug | 🔴 Crítica |
| M4 | **Cobertura de Contrato Explícita** - Cada assinatura pública (hook, repositório, componente) deve ter teste de contrato | 🟡 Alta |
| M5 | **Testes de Migração Obrigatórios** - Cada migração: teste de schema, backfill, auditoria, rollback | 🟡 Alta |
| M6 | **Relatório de RED Completo** - Relatório deve listar: arquivo, teste, motivo do FAIL esperado, contrato coberto | 🟡 Alta |
| M7 | **Validação de `tsc` no RED** - RED deve passar `tsc --noEmit` (só falhas de runtime esperadas) | 🟡 Alta |

---

### HEFESTO (Implementador)

| # | Melhoria | Prioridade |
|---|---|---|
| H1 | **NENHUM CÓDIGO SEM RED COMPLETO** - Hefesto NÃO implementa até Minos confirmar "RED completo para esta task" | 🔴 Crítica |
| H2 | **Implementação Mínima Estrita** - Apenas o necessário para passar os testes RED; nada de "enquanto estou aqui..." | 🔴 Crítica |
| H3 | **Shims Transitórios Documentados e Temporários** - Se precisar de shim: documentar no código, criar issue para remoção, prazo = próxima task | 🔴 Crítica |
| H4 | **Validação de `tsc`/`lint`/`test` Antes de Entregar** - Hefesto deve rodar localmente antes de reportar "done" | 🔴 Crítica |
| H4 | **Remoção Proativa de Código Morto** - Se removeu funcionalidade, deve remover: imports, tipos, testes, comentários | 🟡 Alta |
| H5 | **Relatório de GREEN com Evidências** - Relatório deve provar: quais testes passaram, quais arquivos mudaram, buscas zeradas | 🟡 Alta |
| H7 | **Identificação Proativa de Testes Quebrados** - Se GREEN quebra testes existentes, Hefesto deve reportar IMEDIATAMENTE (não esperar Minos) | 🟡 Alta |

---

### ARGO (Revisor)

| # | Melhoria | Prioridade |
|---|---|---|
| R1 | **Validação de Substituição Real** - Argos deve verificar buscas zeradas (`grep -r "código_removido"`) não só ler relatórios | 🔴 Crítica |
| R2 | **Validação de Migração Aplicável** - Verificar se migrações podem ser aplicadas em ordem (0011→0012→0013→0014) sem conflito | 🟡 Alta |
| R3 | **Checklist de Arquitetura Explícito** - Checklist por eixo com evidências arquivo:linha (já faz, manter) | 🟢 Média |

---

### CARONTE (Commitador)

| # | Melhoria | Prioridade |
|---|---|---|
| C1 | **Validação de Baseline Obrigatória** - Nunca commitar sem `test`/`lint`/`build`/`tsc` verdes | 🔴 Crítica |
| C2 | **Git Add Explícito Sempre** - Nunca `git add .`; listar arquivos no relatório | 🔴 Crítica |
| C3 | **Commit Atômico por Task/Incremento Lógico** - Um commit por incremento lógico, mensagem PT-BR Conventional | 🟡 Alta |
| C4 | **Push Só Quando Autorizado** - Nunca push sem autorização explícita do Zeus | 🔴 Crítica |

---

## Métricas de Sucesso para Próximas Features

| Métrica | Target |
|---|---|
| Replanejamentos por feature | ≤ 1 |
| Correções em homologação | ≤ 1 (apenas ajustes visuais/menores) |
| % Testes escritos antes do código | ≥ 90% |
| Migrações revertidas/renumeradas | 0 |
| Shims transitórios deixados no código | 0 |
| Correções de testes legados durante GREEN | 0 |
| Rodadas de homologação | 1 (apenas validação final) |
| Tempo total feature (similar complexity) | -40% vs esta feature |

---

## Ações Imediatas para Próxima Feature

1. **Zeus:** Criar checklist de "Descoberta Completa" para Hera + "Validação Técnica" para Atena
2. **Hera:** Template de spec com seção obrigatória "Modelo de Domínio" + "Premissas Validadas"
3. **Atena:** Template de plano com seção "Mapeamento Schema→Código" + "Contratos Completos"
4. **Minos:** Template de task com `files[]` obrigatório + critério "RED completo = todos files[] têm FAIL esperado"
4. **Hefesto:** Checklist pré-entrega: `tsc` ✓, `lint` ✓, `test` ✓, `grep` zeradas ✓, shims documentados ✓
5. **Zeus:** Script de validação pré-PLAN_APPROVED (schema real vs plano, migrações numeradas, tasks atômicas)

---

## Conclusão

Esta feature expôs que o processo Olympus funciona bem **quando seguido rigorosamente**, mas falha quando gates são pulados "para ganhar tempo". O tempo "ganho" pulando validações foi pago com juros altíssimos em retrabalho. Próximas features devem tratar os gates como inegociáveis.

---

## Instruções para Agente Limpo Aplicar as Melhorias

---

### Contexto para o Agente Limpo

Você é um agente **sem viés, sem contexto prévio, com contexto fresco**. Sua missão: **aplicar as melhorias identificadas na auto-análise da Feature 5 Mílon ao processo Olympus**, atualizando os arquivos de processo (prompts, templates, checklists, scripts) no diretório `.agents/`.

### Artefatos de Entrada (já existem no projeto)

1. **Auto-análise completa:** `.agents/reports/2026-10-10-milon-05-autoanalysis.md` (este arquivo)
2. **Prompts atuais dos agentes:** `.agents/olimpo/*.md` (8 arquivos: zeus, hera, atena, hefesto, minos, argos, caronte, mnemosine)
3. **Templates de spec/plan/task:** Referenciados nos prompts (não existem como arquivos separados ainda)
4. **Scripts de validação:** `.agents/scripts/guardian.js` (já existe)
5. **Scripts de migração:** `.agents/scripts/new-module.js` (já existe)

---

### Tarefas a Executar

#### 1. Atualizar Prompt do ZEUS (`.agents/olimpo/zeus.md`)

**Adicionar ao prompt do Zeus (seção "Execution Flow" ou nova seção "Quality Gates"):**

```markdown
## Quality Gates Obrigatórios (Intransponíveis)

### Gate 1: Descoberta Completa (antes de SPEC_APPROVED)
- [ ] Hera leu: migrações aplicadas, `types.ts`, repositórios principais
- [ ] Hera confirmou com humano: modelo de domínio, premissas técnicas, edge cases
- [ ] Spec inclui: diagrama textual de entidades, premissas validadas, cenários de edge case

### Gate 2: Validação Técnica (antes de PLAN_APPROVED)
- [ ] Atena leu: migrações, `types.ts`, repositórios, hooks, componentes afetados
- [ ] Plan mapeia: Tabela → Coluna → Migração → Repositório → Hook → Componente
- [ ] Plan define: tipos (Row/Domain/Input), interfaces, signatures, props
- [ ] Plan especifica: DDL exato, backfill, rollback, auditoria por migração
- [ ] Plan lista: código legado removível, critério de busca zerada, arquivos afetados

### Gate 3: RED Completo (antes de CODING)
- [ ] Minos confirmou: TODOS os `files[]` da task têm testes FAIL pelo motivo certo
- [ ] RED passa `tsc --noEmit` (só falhas de runtime esperadas)
- [ ] Relatório de RED lista: arquivo, teste, motivo FAIL, contrato coberto

### Gate 4: GREEN Mínimo (antes de TESTING)
- [ ] Hefesto rodou: `tsc`, `lint`, `test` localmente antes de entregar
- [ ] Hefesto reportou: testes passados, arquivos mudados, buscas zeradas, shims documentados
- [ ] Hefesto reportou IMEDIATAMENTE se quebrou testes existentes

### Gate 5: Substituição Real (antes de APPROVED)
- [ ] Argos verificou: `grep -r "código_removido"` retorna 0
- [ ] Argos verificou: migrações aplicáveis em ordem (0011→0012→0013→0014)
- [ ] Minos confirmou: fixtures atualizadas, `tsc` limpo, suite verde

### Controle de Migrações (Zeus mantém em `context.json`)
```json
{
  "migrations": {
    "0011": {"status": "applied", "file": "migration-0011-...", "applied_at": "..."},
    "0012": {"status": "applied", "file": "migration-0012-...", "applied_at": "..."}
  }
}
```

### Validação de Handoff (Checklist Obrigatório)
Antes de delegar, Zeus deve confirmar:
- [ ] Agente receptor tem: spec, plan, tasks, código real acessível
- [ ] Agente receptor sabe: `files[]` exatos, `acceptanceCriteria`, `consumes`/`produces`
- [ ] Gaps identificados e comunicados: "Falta X para você começar"
```

---

#### 2. Criar Template de Spec para HERA (`.agents/templates/spec-template.md`)

```markdown
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
```

---

#### 3. Criar Template de Plan para ATENA (`.agents/templates/plan-template.md`)

```markdown
# Plan Template — Olympus

## Mapeamento Schema → Código (Obrigatório)
| Tabela | Coluna | Migração | Repositório | Hook | Componente |
|---|---|---|---|---|---|
| workout_entries | mode, load_unit | 0012 | workouts.ts | useWorkoutDetail | ExerciseEntryCard |

## Contratos Completos (Obrigatório)
### Tipos
```typescript
// types.ts
export interface WorkoutEntryRow {
  mode?: 'repeticao' | 'tempo';
  load_unit?: 'kg' | 'lb';
}
```

### Interfaces de Repositório
```typescript
// interfaces.ts
export interface IWorkoutRepository {
  setEntryMode(id: string, mode: ExerciseMode): Promise<WorkoutEntry>;
  setEntryLoadUnit(id: string, unit: LoadUnit): Promise<WorkoutEntry>;
}
```

### Signatures de Hooks
```typescript
// hooks/useWorkoutDetail.ts
export function useWorkoutDetail(workoutId: string) {
  return {
    setEntryMode: (entryId: string, mode: ExerciseMode) => Promise<void>,
    setEntryLoadUnit: (entryId: string, unit: LoadUnit) => Promise<void>,
  };
}
```

### Props de Componentes
```typescript
// components/milon/ExerciseEntryCard.tsx
interface ExerciseEntryCardProps {
  exerciseMode?: ExerciseMode | null;
  onModeCommit?: (entryId: string, mode: ExerciseMode) => void;
  onUnitCommit?: (entryId: string, unit: LoadUnit) => void;
}
```

## Migrações (Obrigatório)
| # | Arquivo | DDL | Backfill | Rollback | Auditoria |
|---|---|---|---|---|---|
| 0013 | migration-0013-...sql | `ADD COLUMN value INTEGER` | `COALESCE(reps, duration_seconds)` | `DROP COLUMN value` | `script_name` idêntico |

## Código Legado/Removível (Obrigatório)
| Item | Critério de Busca Zerada | Arquivos Afetados |
|---|---|---|
| `reps`/`duration_seconds` | `grep -r "reps\|durationSeconds" lib/ components/` | `types.ts`, `workouts.ts`, `SeriesCard.tsx` |

## Tasks (Obrigatório)
```json
{
  "tasks": [
    {
      "id": "TASK-001",
      "title": "...",
      "assignee": "minos",
      "files": ["__tests__/.../file.test.ts"],
      "acceptanceCriteria": ["npm test -- file.test.ts → FAIL esperado: ..."],
      "consumes": [],
      "produces": ["contrato X"]
    }
  ]
}
```

---

#### 4. Criar Template de Task para MINOS (`.agents/templates/task-template.json`)

```json
{
  "id": "TASK-XXX",
  "title": "Descrição curta",
  "assignee": "minos|hefesto|argos",
  "dependencies": ["TASK-XXX"],
  "files": [
    "__tests__/caminho/arquivo.test.ts",
    "__tests__/caminho/outro.test.tsx"
  ],
  "acceptanceCriteria": [
    "npm test -- __tests__/caminho/arquivo.test.ts → FAIL esperado: motivo exato",
    "npx tsc --noEmit → exit 0 (só falhas runtime esperadas)"
  ],
  "consumes": ["contrato X do plano"],
  "produces": ["contrato Y para próxima task"],
  "status": "pending"
}
```

---

#### 5. Atualizar Script Guardian (`.agents/scripts/guardian.js`)

Adicionar validações:

```javascript
// Novas validações no guardian.js
function validateSpecComplete(specPath) {
  const spec = readFile(specPath);
  const requiredSections = ['Modelo de Domínio', 'Premissas Técnicas Validadas', 'Cenários de Edge Case'];
  for (const section of requiredSections) {
    if (!spec.includes(section)) {
      throw new Error(`Spec incompleta: seção "${section}" ausente`);
    }
  }
  // Verificar premissas validadas
  if (!spec.includes('Validada com Humano? ✅ Sim')) {
    throw new Error('Premissas técnicas não validadas com humano');
  }
}

function validatePlanComplete(planPath) {
  const plan = readFile(planPath);
  const requiredSections = ['Mapeamento Schema → Código', 'Contratos Completos', 'Migrações', 'Código Legado/Removível', 'Tasks'];
  for (const section of requiredSections) {
    if (!plan.includes(section)) {
      throw new Error(`Plan incompleto: seção "${section}" ausente`);
    }
  }
  // Verificar mapeamento schema→código
  if (!plan.includes('Tabela | Coluna | Migração | Repositório | Hook | Componente')) {
    throw new Error('Plan sem mapeamento Schema→Código');
  }
}

function validateRedComplete(task, testFiles) {
  for (const file of task.files) {
    const result = runCommand(`npx vitest run ${file}`);
    if (result.passed === result.total) {
      throw new Error(`RED incompleto: ${file} não tem falhas esperadas`);
    }
    // Verificar se falhas são pelo motivo esperado (não sintaxe)
    const output = runCommand(`npx vitest run ${file} --reporter=verbose`);
    if (output.includes('SyntaxError') || output.includes('TS2')) {
      throw new Error(`RED com erro de sintaxe/tipo em ${file}`);
    }
  }
}

function validateMigrationOrder(migrations) {
  const applied = getAppliedMigrations(); // lê schema_migrations
  for (const m of migrations) {
    if (m.id <= Math.max(...applied.map(m => m.id))) {
      if (!m.allowReapply) {
        throw new Error(`Migração ${m.id} já aplicada ou conflito de ordem`);
      }
    }
  }
}
```

---

#### 6. Atualizar Script New-Module (`.agents/scripts/new-module.js`)

Adicionar validação de migração:

```javascript
// Em new-module.js, adicionar:
function validateMigrationSequence(moduleMigrations) {
  const existing = getExistingMigrations(); // lê utils/migrations/
  const maxId = Math.max(...existing.map(m => parseInt(m.match(/\d+/)[0])));
  
  for (const m of moduleMigrations) {
    const id = parseInt(m.id);
    if (id <= maxId) {
      throw new Error(`Migração ${m.id} conflita com existente (max: ${maxId}). Use ${maxId + 1}.`);
    }
  }
}
```

---

### Como Executar

1. **Leia** a auto-análise completa em `.agents/reports/2026-10-10-milon-05-autoanalysis.md`
2. **Aplique** as mudanças nos arquivos listados acima (prompts, templates, scripts)
3. **Valide** rodando uma feature teste simples (pode ser um "hello world" module) passando por todos os gates
4. **Reporte** quaisquer conflitos ou ajustes necessários

### Critérios de Sucesso da Aplicação

- [ ] Zeus tem gates intransponíveis implementados
- [ ] Hera tem template de spec com validações obrigatórias
- [ ] Atena tem template de plan com mapeamento schema→código obrigatório
- [ ] Minos tem template de task com RED completo obrigatório
- [ ] Hefesto tem checklist pré-entrega obrigatório
- [ ] Guardian valida spec/plan/RED completos
- [ ] New-module valida sequência de migrações
- [ ] Feature teste passa por todos os gates sem replanejamento

---

**Boa sorte! O processo Olympus é poderoso quando seguido rigorosamente. A Feature 5 provou que pular gates "para ganhar tempo" custa 10x mais no final.**