"use client";

import { Fragment, useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AsyncState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/button";
import WorkoutEntriesList from "@/components/milon/WorkoutEntriesList";
import ExercisePickerModal from "@/components/milon/ExercisePickerModal";
import ExerciseModal, {
  type ExerciseModalAction,
  type ExerciseModalFields,
} from "@/components/milon/ExerciseModal";
import WorkoutConfirmModal, {
  type WorkoutConfirmVariant,
} from "@/components/milon/WorkoutConfirmModal";
import SeriesEditModal, {
  type SeriesEditFields,
} from "@/components/milon/SeriesEditModal";
import { useWorkoutDetail } from "@/lib/milon/hooks/useWorkoutDetail";
import { useWorkoutExecution } from "@/lib/milon/hooks/useWorkoutExecution";
import { setExerciseLoadUnitStandalone } from "@/lib/milon/db/exercises";
import {
  compareExercisesByMuscleThenName,
  normalizeExerciseText,
} from "@/lib/milon/utils";
import type {
  Exercise,
  LoadUnit,
  WorkoutEntry,
  WorkoutEntryView,
  WorkoutSeries,
} from "@/lib/milon/types";
import type { SerieField, SeriesExecutionProps } from "@/components/milon/SeriesCard";

export type WorkoutDetailBackTarget =
  | { kind: "program"; programId: string }
  | { kind: "none" };

export interface WorkoutDetailSectionProps {
  workoutId: string;
  backTarget: WorkoutDetailBackTarget;
  title?: string;
  headerActions?: ReactNode | null;
  entryFooter?: ((view: WorkoutEntryView) => ReactNode) | ReactNode | null;
  footer?: ReactNode | null;
  /**
   * Execução série a série (Mílon #5, opt-in, default desligado): quando
   * ligada compõe `useWorkoutExecution`, monta o pacote de execução e
   * hospeda o SeriesEditModal + a confirmação de limpeza. Desligada, o
   * comportamento é idêntico ao atual (manutenção intacta por construção).
   */
  executionEnabled?: boolean;
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function deriveMuscleOptions(items: Exercise[]): string[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const key = normalizeExerciseText(item.muscle);
    if (!seen.has(key)) seen.set(key, item.muscle);
  }
  return [...seen.values()].sort((a, b) =>
    normalizeExerciseText(a).localeCompare(normalizeExerciseText(b), "pt-BR"),
  );
}

interface ConfirmState {
  variant: WorkoutConfirmVariant;
  entry: WorkoutEntry;
  exerciseName: string;
  seriesCount: number;
  currentQuantity: number;
  newQuantity: number;
}

interface EditingTarget {
  entry: WorkoutEntry;
  serie: WorkoutSeries;
  loadUnit: LoadUnit | null;
}

interface ExecutionListContext {
  executionPackage: SeriesExecutionProps | undefined;
  execErrorMsg: string | null;
  execSuccessNotice: string | null;
  clearConfirmOpen: boolean;
  clearProcessing: boolean;
  confirmClear: () => void;
  cancelClear: () => void;
  editing: EditingTarget | null;
  editorSaving: boolean;
  editorError: string | null;
  closeEditor: () => void;
  saveEditor: (fields: SeriesEditFields) => Promise<void>;
  chooseEditorUnit: (unit: LoadUnit) => void;
}

/**
 * Dono da execução série a série (Mílon #5). Montado SOMENTE quando a flag
 * `executionEnabled` está ligada — por isso o hook de execução nunca é
 * chamado na manutenção (sem hooks condicionais no corpo da seção). Detém o
 * estado do editor, monta o pacote a partir de `doneSeriesIds` e expõe tudo
 * via render prop para o corpo da seção compor lista + modal + confirmação.
 */
function ExecutionHost({
  workoutId,
  entries,
  onTemplateChanged,
  onChooseUnitForEntry,
  children,
}: {
  workoutId: string;
  entries: WorkoutEntryView[];
  onTemplateChanged: () => void;
  onChooseUnitForEntry: (entryId: string, unit: LoadUnit) => void;
  children: (ctx: ExecutionListContext) => ReactNode;
}) {
  const exec = useWorkoutExecution(workoutId);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [clearProcessing, setClearProcessing] = useState(false);
  // Releitura da execução após cada alternância (o hook real já se atualiza
  // sozinho; o sinal garante a composição com o estado mais recente, ex.: a
  // confirmação de limpeza da última série desmarcada).
  const [, bumpExecution] = useState(0);

  function findTarget(seriesId: string): EditingTarget | null {
    for (const view of entries) {
      const serie = view.series.find((item) => item.id === seriesId);
      if (serie) {
        return { entry: view.entry, serie, loadUnit: view.exercise.loadUnit };
      }
    }
    return null;
  }

  async function handleToggle(seriesId: string): Promise<void> {
    const target = findTarget(seriesId);
    if (!target) return;
    try {
      await exec.toggleSeries(target.entry, target.serie);
    } catch {
      // O banner já foi alimentado pelo hook (origem operacao) e o estado
      // anterior é mantido; aqui só se evita rejeição não tratada.
    } finally {
      // Releitura do estado da execução após a alternância: o hook real já
      // se atualiza sozinho, e o sinal garante a composição atualizada (ex.:
      // a confirmação de limpeza da última desmarcada).
      bumpExecution((tick) => tick + 1);
    }
  }

  function handleOpenEditor(seriesId: string): void {
    const target = findTarget(seriesId);
    if (!target) return;
    setEditorError(null);
    setEditing(target);
  }

  function closeEditor(): void {
    if (!editorSaving) {
      setEditing(null);
      setEditorError(null);
    }
  }

  async function saveEditor(fields: SeriesEditFields): Promise<void> {
    const target = editing;
    if (!target) return;
    setEditorSaving(true);
    setEditorError(null);
    try {
      // Comportamento único (D4): origem + seguintes, feito preservado —
      // decisão do hook, sem indicador de cópia.
      await exec.saveSeriesExecution(target.entry, target.serie, fields);
      setEditing(null);
      setEditorError(null);
      onTemplateChanged();
    } catch (err: unknown) {
      // Modal nunca fecha no erro: registra local, exibe via prop e relança
      // para o modal preservar o digitado.
      const message = toMessage(err, "Erro ao salvar série");
      setEditorError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setEditorSaving(false);
    }
  }

  function confirmClear(): void {
    setClearProcessing(true);
    void exec.confirmClearExecution().then(
      () => setClearProcessing(false),
      () => setClearProcessing(false),
    );
  }

  function cancelClear(): void {
    if (!clearProcessing) exec.cancelClearExecution();
  }

  function chooseEditorUnit(unit: LoadUnit): void {
    // Paridade com a manutenção (D18): escolha de unidade do modal persiste
    // na hora pelo caminho existente da seção, com reversão visível em falha.
    const target = editing;
    if (!target) return;
    onChooseUnitForEntry(target.entry.id, unit);
  }

  const doneBySeriesId: Record<string, boolean> = {};
  for (const id of exec.doneSeriesIds) doneBySeriesId[id] = true;

  // Com o editor aberto o modal em tela cheia cobre a lista; o pacote é
  // suspenso para que nenhum marcador concorra com o formulário.
  const executionPackage: SeriesExecutionProps | undefined =
    editing !== null
      ? undefined
      : {
          doneBySeriesId,
          onToggle: handleToggle,
          onOpenEditor: handleOpenEditor,
        };

  return (
    <>
      {children({
        executionPackage,
        execErrorMsg: exec.errorMsg,
        execSuccessNotice: exec.successNotice,
        clearConfirmOpen: exec.clearConfirmOpen,
        clearProcessing,
        confirmClear,
        cancelClear,
        editing,
        editorSaving,
        editorError,
        closeEditor,
        saveEditor,
        chooseEditorUnit,
      })}
    </>
  );
}

export function WorkoutDetailSection({
  workoutId,
  backTarget,
  headerActions = null,
  entryFooter = null,
  footer = null,
  executionEnabled = false,
}: WorkoutDetailSectionProps) {
  const router = useRouter();

  const {
    workout,
    program,
    entries,
    exercises,
    loading,
    errorMsg,
    errorOrigin,
    successNotice,
    retry,
    addExercise,
    removeEntry,
    reorderEntries,
    setQuantity,
    setRest,
    updateSeries,
    applyToAll,
    saveExercise,
    createExerciseAndAdd,
  } = useWorkoutDetail(workoutId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerSaving, setPickerSaving] = useState(false);

  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [exerciseModalError, setExerciseModalError] = useState<string | null>(
    null,
  );
  const [exerciseSaving, setExerciseSaving] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmProcessing, setConfirmProcessing] = useState(false);

  // Toggle kg/lb otimista (sem reload): a troca visual acontece na hora via
  // estado local do SeriesCard + override por exercício aqui na seção; a
  // persistência roda em background sem refetch cheio (sem setLoading/retry).
  const [unitOverrides, setUnitOverrides] = useState<Record<string, LoadUnit>>(
    {},
  );
  const [unitError, setUnitError] = useState<string | null>(null);

  const readOnly = program?.status === "inativo";
  const backProgramId =
    backTarget.kind === "program" ? backTarget.programId : "";
  const programId = program?.id ?? backProgramId;

  // Entradas/exercícios com a unidade otimista aplicada: todos os cards do
  // mesmo exercício passam a exibir a nova unidade (principal + secundária
  // convertida) na hora, sem remontar inputs (keys por carga intactas).
  const entriesWithUnit = useMemo(
    () =>
      unitOverrides && Object.keys(unitOverrides).length === 0
        ? entries
        : entries.map((view) => {
            const override = unitOverrides[view.exercise.id];
            if (!override || view.exercise.loadUnit === override) return view;
            return {
              ...view,
              exercise: { ...view.exercise, loadUnit: override },
            };
          }),
    [entries, unitOverrides],
  );

  const exercisesWithUnit = useMemo(
    () =>
      unitOverrides && Object.keys(unitOverrides).length === 0
        ? exercises
        : exercises.map((exercise) => {
            const override = unitOverrides[exercise.id];
            if (!override || exercise.loadUnit === override) return exercise;
            return { ...exercise, loadUnit: override };
          }),
    [exercises, unitOverrides],
  );

  const muscleOptions = useMemo(
    () => deriveMuscleOptions(exercisesWithUnit),
    [exercisesWithUnit],
  );

  const pickerExercises = useMemo(
    () =>
      [...exercisesWithUnit]
        .filter((exercise) => exercise.deletedAt === null)
        .sort(compareExercisesByMuscleThenName),
    [exercisesWithUnit],
  );

  const findView = useCallback(
    (entryId: string) =>
      entriesWithUnit.find((view) => view.entry.id === entryId),
    [entriesWithUnit],
  );

  const handleBackToProgram = useCallback(() => {
    router.push(`/milon/programs/${programId}`);
  }, [router, programId]);

  const openPicker = useCallback(() => {
    setPickerError(null);
    setPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    if (!pickerSaving) {
      setPickerOpen(false);
      setPickerError(null);
    }
  }, [pickerSaving]);

  const handleSelect = useCallback(
    (exercise: Exercise) => {
      setPickerSaving(true);
      setPickerError(null);
      void addExercise(exercise.id).then(
        () => {
          setPickerSaving(false);
          setPickerOpen(false);
          setPickerError(null);
        },
        (err: unknown) => {
          // D14: bloqueio mantém o modal aberto com mensagem visível.
          setPickerSaving(false);
          setPickerError(toMessage(err, "Erro ao adicionar exercício"));
        },
      );
    },
    [addExercise],
  );

  const handleCreateNew = useCallback(() => {
    setEditingExercise(null);
    setExerciseModalError(null);
    setExerciseModalOpen(true);
  }, []);

  const closeExerciseModal = useCallback(() => {
    if (!exerciseSaving) {
      setExerciseModalOpen(false);
      setEditingExercise(null);
      setExerciseModalError(null);
    }
  }, [exerciseSaving]);

  const handleExerciseModalSave = useCallback(
    async (
      fields: ExerciseModalFields,
      action: ExerciseModalAction,
    ): Promise<void> => {
      void action;
      setExerciseSaving(true);
      setExerciseModalError(null);
      try {
        if (editingExercise) {
          await saveExercise(editingExercise.id, {
            name: fields.name,
            muscle: fields.muscle,
            videoLink: fields.videoLink,
          });
        } else {
          await createExerciseAndAdd({
            name: fields.name,
            muscle: fields.muscle,
            videoLink: fields.videoLink,
          });
          setPickerOpen(false);
          setPickerError(null);
        }
        setExerciseModalOpen(false);
        setEditingExercise(null);
      } catch (err: unknown) {
        // Anti-duplicata da #1: mensagem visível, modal permanece aberto.
        const message = toMessage(err, "Erro ao salvar exercício");
        setExerciseModalError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setExerciseSaving(false);
      }
    },
    [editingExercise, saveExercise, createExerciseAndAdd],
  );

  const handleEditExercise = useCallback(
    (entryId: string) => {
      const view = findView(entryId);
      if (!view) return;
      setEditingExercise(view.exercise);
      setExerciseModalError(null);
      setExerciseModalOpen(true);
    },
    [findView],
  );

  const handleRemoveEntry = useCallback(
    (entryId: string) => {
      const view = findView(entryId);
      if (!view) return;
      if (view.series.length === 0) {
        // D6: sem séries, ação direta.
        void removeEntry(view.entry).catch(() => {
          // O erro fica visível na página via hook (banner).
        });
        return;
      }
      setConfirm({
        variant: "remover-exercicio",
        entry: view.entry,
        exerciseName: view.exercise.name,
        seriesCount: view.series.length,
        currentQuantity: view.series.length,
        newQuantity: view.series.length,
      });
    },
    [findView, removeEntry],
  );

  const handleQuantityCommit = useCallback(
    (entryId: string, quantity: number) => {
      void setQuantity(entryId, quantity).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [setQuantity],
  );

  const handleRequestReduce = useCallback(
    (entryId: string, newQuantity: number) => {
      const view = findView(entryId);
      if (!view) return;
      setConfirm({
        variant: "reduzir-series",
        entry: view.entry,
        exerciseName: view.exercise.name,
        seriesCount: view.series.length,
        currentQuantity: view.series.length,
        newQuantity,
      });
    },
    [findView],
  );

  const handleRestCommit = useCallback(
    (entryId: string, seconds: number | null) => {
      void setRest(entryId, seconds).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [setRest],
  );

  const handleSeriesCommit = useCallback(
    (entryId: string, seriesId: string, field: SerieField, value: number | null) => {
      void entryId;
      // Carga commita direto; unidade via toggle kg/lb (handleConfirmUnit).
      void updateSeries(seriesId, field, value).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [updateSeries],
  );

  const handleApplyAll = useCallback(
    (entryId: string, seriesId: string) => {
      void applyToAll(entryId, seriesId).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [applyToAll],
  );

  const handleConfirmUnit = useCallback(
    (entryId: string, unit: LoadUnit) => {
      // Toggle kg/lb instantâneo (como o toggle Repetições/Tempo): atualiza
      // o visual na hora via override otimista + estado local do SeriesCard
      // e persiste em background sem refetch cheio (sem setLoading/retry, sem
      // remontar a lista). Só a unidade é persistida (D10); a carga segue
      // intacta (D7: vazio ≠ 0). Falha reverte o override e comunica via
      // banner local (origem operacao: sem retry, norma D27/R31).
      const view = findView(entryId);
      if (!view) return;
      const exerciseId = view.exercise.id;
      const previous: LoadUnit | null = view.exercise.loadUnit;
      if (previous === unit) return;
      setUnitOverrides((prev) => ({ ...prev, [exerciseId]: unit }));
      setUnitError(null);
      void setExerciseLoadUnitStandalone(exerciseId, unit).catch(
        (err: unknown) => {
          setUnitOverrides((prev) => {
            const next = { ...prev };
            if (previous === null) {
              delete next[exerciseId];
            } else {
              next[exerciseId] = previous;
            }
            return next;
          });
          setUnitError(toMessage(err, "Não foi possível salvar a unidade."));
        },
      );
    },
    [findView],
  );

  const handleReorder = useCallback(
    (orderedIds: string[]) => {
      void reorderEntries(orderedIds).catch(() => {
        // O erro fica visível na página via hook (banner).
      });
    },
    [reorderEntries],
  );

  const handleConfirm = useCallback(() => {
    const target = confirm;
    if (!target) return;
    setConfirmProcessing(true);
    const done = () => {
      setConfirmProcessing(false);
      setConfirm(null);
    };
    if (target.variant === "remover-exercicio") {
      void removeEntry(target.entry).then(done, () => done());
    } else {
      void setQuantity(target.entry.id, target.newQuantity).then(done, () =>
        done(),
      );
    }
  }, [confirm, removeEntry, setQuantity]);

  const handleConfirmCancel = useCallback(() => {
    if (!confirmProcessing) setConfirm(null);
  }, [confirmProcessing]);

  return (
    <AsyncState
        loading={loading}
        error={errorMsg}
        errorOrigin={errorOrigin}
        empty={workout === null}
        noResults={false}
        onRetry={() => void retry()}
        loadingText="Carregando treino…"
        emptyTitle="Treino não encontrado."
        emptyText="Este treino não existe ou foi removido. Volte e escolha outro treino."
      >
        {workout ? (
          <div className="flex flex-col gap-4">
            <section
              aria-label="Cabeçalho do treino"
              className="rounded-lg border bg-card p-6 shadow-sm flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-2xl leading-snug text-[#B7602B] tracking-wider flex-1">
                  {workout.name}
                </h2>
                {headerActions ?? null}
                {backTarget.kind === "program" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToProgram}
                    aria-label="Voltar ao programa"
                  >
                    Voltar ao programa
                  </Button>
                ) : null}
              </div>
            </section>

            {successNotice ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {successNotice}
              </div>
            ) : null}

            {unitError ? (
              <div
                role="alert"
                className="rounded border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium"
              >
                {unitError}
              </div>
            ) : null}

            {executionEnabled ? (
              <ExecutionHost
                workoutId={workoutId}
                entries={entriesWithUnit}
                onTemplateChanged={() => void retry()}
                onChooseUnitForEntry={handleConfirmUnit}
              >
                {(ctx) => (
                  <>
                    {ctx.execSuccessNotice ? (
                      <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {ctx.execSuccessNotice}
                      </div>
                    ) : null}

                    {ctx.execErrorMsg ? (
                      <div
                        role="alert"
                        className="rounded border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium"
                      >
                        {ctx.execErrorMsg}
                      </div>
                    ) : null}

                    <WorkoutEntriesList
                      entries={entriesWithUnit}
                      programId={programId}
                      readOnly={readOnly ?? false}
                      empty={entriesWithUnit.length === 0}
                      errorMsg={errorMsg}
                      errorOrigin={errorOrigin}
                      onAdd={openPicker}
                      onRetry={() => void retry()}
                      onReorder={handleReorder}
                      onQuantityCommit={handleQuantityCommit}
                      onRequestReduce={handleRequestReduce}
                      onRestCommit={handleRestCommit}
                      onSeriesCommit={handleSeriesCommit}
                      onApplyAll={handleApplyAll}
                      onEditExercise={handleEditExercise}
                      onRemoveEntry={handleRemoveEntry}
                      onConfirmUnit={handleConfirmUnit}
                      execution={ctx.executionPackage}
                    />

                    <SeriesEditModal
                      open={ctx.editing !== null}
                      series={ctx.editing?.serie ?? null}
                      loadUnit={ctx.editing?.loadUnit ?? null}
                      saving={ctx.editorSaving}
                      error={ctx.editorError}
                      onClose={ctx.closeEditor}
                      onChooseUnit={ctx.chooseEditorUnit}
                      onSave={ctx.saveEditor}
                    />

                    <WorkoutConfirmModal
                      open={ctx.clearConfirmOpen}
                      variant="limpar-execucao"
                      exerciseName=""
                      seriesCount={0}
                      currentQuantity={0}
                      newQuantity={0}
                      processing={ctx.clearProcessing}
                      onConfirm={ctx.confirmClear}
                      onCancel={ctx.cancelClear}
                    />
                  </>
                )}
              </ExecutionHost>
            ) : (
              <WorkoutEntriesList
                entries={entriesWithUnit}
                programId={programId}
                readOnly={readOnly ?? false}
                empty={entriesWithUnit.length === 0}
                errorMsg={errorMsg}
                errorOrigin={errorOrigin}
                onAdd={openPicker}
                onRetry={() => void retry()}
                onReorder={handleReorder}
                onQuantityCommit={handleQuantityCommit}
                onRequestReduce={handleRequestReduce}
                onRestCommit={handleRestCommit}
                onSeriesCommit={handleSeriesCommit}
                onApplyAll={handleApplyAll}
                onEditExercise={handleEditExercise}
                onRemoveEntry={handleRemoveEntry}
                onConfirmUnit={handleConfirmUnit}
              />
            )}

            {entryFooter
              ? entriesWithUnit.map((view) => (
                  <Fragment key={view.entry.id}>
                    {typeof entryFooter === "function"
                      ? entryFooter(view)
                      : entryFooter}
                  </Fragment>
                ))
              : null}

            <ExercisePickerModal
              open={pickerOpen}
              exercises={pickerExercises}
              loading={false}
              error={pickerError}
              saving={pickerSaving}
              searchText={searchText}
              muscleFilter={muscleFilter}
              muscleOptions={muscleOptions}
              onSearch={setSearchText}
              onFilterMuscle={setMuscleFilter}
              onSelect={handleSelect}
              onCreateNew={handleCreateNew}
              onClose={closePicker}
            />

            <ExerciseModal
              open={exerciseModalOpen}
              editingExercise={editingExercise}
              muscleOptions={muscleOptions}
              saving={exerciseSaving}
              error={exerciseModalError}
              successNotice={null}
              onClose={closeExerciseModal}
              onSave={handleExerciseModalSave}
            />

            <WorkoutConfirmModal
              open={confirm !== null}
              variant={confirm?.variant ?? "remover-exercicio"}
              exerciseName={confirm?.exerciseName ?? ""}
              seriesCount={confirm?.seriesCount ?? 0}
              currentQuantity={confirm?.currentQuantity ?? 0}
              newQuantity={confirm?.newQuantity ?? 0}
              processing={confirmProcessing}
              onConfirm={handleConfirm}
              onCancel={handleConfirmCancel}
            />

            {footer ?? null}
          </div>
        ) : null}
    </AsyncState>
  );
}

export default WorkoutDetailSection;
