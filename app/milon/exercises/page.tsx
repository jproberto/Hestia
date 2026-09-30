"use client";

import { useCallback, useState } from "react";
import { MilonLayout } from "@/components/milon/MilonLayout";
import ExerciseList from "@/components/milon/ExerciseList";
import ExerciseModal, {
  type ExerciseModalAction,
  type ExerciseModalFields,
} from "@/components/milon/ExerciseModal";
import DeleteExerciseConfirm from "@/components/milon/DeleteExerciseConfirm";
import { Button } from "@/components/ui/button";
import { useExercises } from "@/lib/milon/hooks/useExercises";
import type { Exercise } from "@/lib/milon/types";

function toMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Tela da biblioteca de exercícios (Mílon #1, servida em `/milon/exercises`
 * a partir do Patch v3 — mudança de rota apenas, sem comportamento novo).
 * Enxuta: só composição + modais. Todo fetch/estado/operações vive
 * em `useExercises`; regras puras vivem em `lib/milon/utils.ts`.
 */
export default function MilonExercisesPage() {
  const {
    exercises,
    visibleExercises,
    remainingCount,
    muscleOptions,
    muscleFilter,
    searchText,
    sortOrder,
    loading,
    error,
    successNotice,
    setMuscleFilter,
    setSearchText,
    setSortOrder,
    showMore,
    retry,
    save,
    saveAndNew,
    remove,
  } = useExercises();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isEmpty = exercises.length === 0;

  const openCreateModal = useCallback(() => {
    setEditingExercise(null);
    setModalError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingExercise(null);
    setModalError(null);
  }, []);

  const handleEdit = useCallback((exercise: Exercise) => {
    setEditingExercise(exercise);
    setModalError(null);
    setModalOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((exercise: Exercise) => {
    setDeleteTarget(exercise);
  }, []);

  const handleModalSave = useCallback(
    async (fields: ExerciseModalFields, action: ExerciseModalAction): Promise<void> => {
      setSaving(true);
      setModalError(null);
      try {
        if (editingExercise) {
          await save(fields, editingExercise.id);
          // Salvar fecha; salvar-e-outro atualiza e inicia o próximo
          // cadastro (o modal limpa nome/link mantendo o músculo).
          setEditingExercise(null);
          if (action === "salvar") setModalOpen(false);
        } else if (action === "salvar") {
          await save(fields, null);
          setModalOpen(false);
        } else {
          await saveAndNew(fields);
        }
      } catch (err: unknown) {
        // Nunca fecha no erro: registra mensagem visível e relança para
        // o modal preservar o digitado (padrão homologado).
        const message = toMessage(err, "Erro ao salvar exercício");
        setModalError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [editingExercise, save, saveAndNew],
  );

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Mantém a confirmação aberta; o erro fica visível na lista via hook.
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, remove]);

  const handleDeleteCancel = useCallback(() => {
    if (!deleting) setDeleteTarget(null);
  }, [deleting]);

  return (
    <MilonLayout
      pageTitle="Biblioteca de exercícios"
      pageSubtitle="Cadastre uma vez e reuse nos treinos"
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button type="button" onClick={openCreateModal}>
            Novo exercício
          </Button>
        </div>

        <ExerciseList
          visibleItems={visibleExercises}
          remainingCount={remainingCount}
          muscleOptions={muscleOptions}
          muscleFilter={muscleFilter}
          searchText={searchText}
          sortOrder={sortOrder}
          loading={loading}
          error={error}
          isEmpty={isEmpty}
          onFilterChange={setMuscleFilter}
          onSearchChange={setSearchText}
          onSortChange={setSortOrder}
          onShowMore={showMore}
          onRetry={retry}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />

        <ExerciseModal
          open={modalOpen}
          editingExercise={editingExercise}
          muscleOptions={muscleOptions}
          saving={saving}
          error={modalError}
          successNotice={successNotice}
          onClose={closeModal}
          onSave={handleModalSave}
        />

        <DeleteExerciseConfirm
          open={deleteTarget !== null}
          exerciseName={deleteTarget?.name ?? ""}
          muscle={deleteTarget?.muscle ?? ""}
          deleting={deleting}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={handleDeleteCancel}
        />
      </div>
    </MilonLayout>
  );
}
