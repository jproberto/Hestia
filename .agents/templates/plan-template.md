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