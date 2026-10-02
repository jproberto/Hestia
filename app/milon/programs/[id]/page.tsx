"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { MilonLayout } from "@/components/milon/MilonLayout";
import { AsyncState } from "@/components/ui/AsyncState";
import { Button } from "@/components/ui/button";
import WorkoutList from "@/components/milon/WorkoutList";
import WorkoutModal from "@/components/milon/WorkoutModal";
import { useProgramDetail } from "@/lib/milon/hooks/useProgramDetail";
import { useProgramWorkouts } from "@/lib/milon/hooks/useProgramWorkouts";
import { STATUS_LABEL } from "@/lib/milon/program-utils";
import { sugerirNomeTreino } from "@/lib/milon/workout-utils";
import type { Workout } from "@/lib/milon/types";

function resolveId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function ProgramDetailPage() {
  const params = useParams();
  const id = resolveId(params?.id as string | string[] | undefined);
  const { program, loading, error, retry } = useProgramDetail(id);
  const {
    workouts,
    subtitles,
    loading: workoutsLoading,
    errorMsg: workoutsError,
    errorOrigin: workoutsOrigin,
    successNotice,
    retry: retryWorkouts,
    create,
    rename,
    remove,
  } = useProgramWorkouts(id);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"criar" | "renomear">("criar");
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const readOnly = program?.status === "inativo";

  const openCreateModal = useCallback(() => {
    setEditingWorkout(null);
    setModalMode("criar");
    setModalError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingWorkout(null);
    setModalError(null);
  }, []);

  const handleRename = useCallback((workout: Workout) => {
    setEditingWorkout(workout);
    setModalMode("renomear");
    setModalError(null);
    setModalOpen(true);
  }, []);

  const handleModalSave = useCallback(
    async (name: string): Promise<void> => {
      setSaving(true);
      setModalError(null);
      try {
        if (editingWorkout) {
          await rename(editingWorkout.id, { name });
        } else {
          await create({ name });
        }
        setModalOpen(false);
        setEditingWorkout(null);
      } catch (err: unknown) {
        // Nunca fecha no erro: registra mensagem visível e relança para
        // o modal preservar o digitado (padrão homologado).
        const message = toMessage(err, "Erro ao salvar treino");
        setModalError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [editingWorkout, create, rename],
  );

  const handleDelete = useCallback(
    (workout: Workout) => {
      void remove(workout).catch(() => {
        // O erro fica visível na lista via hook (banner `bloqueio`/`operacao`).
      });
    },
    [remove],
  );

  const defaultName = editingWorkout
    ? editingWorkout.name
    : sugerirNomeTreino(workouts.map((w) => w.name));
  const otherNames = editingWorkout
    ? workouts.filter((w) => w.id !== editingWorkout.id).map((w) => w.name)
    : workouts.map((w) => w.name);

  return (
    <MilonLayout pageTitle="Programa">
      <AsyncState
        loading={loading}
        error={error}
        empty={program === null}
        noResults={false}
        onRetry={() => void retry()}
        loadingText="Carregando programa…"
        emptyTitle="Programa não encontrado."
        emptyText="Este programa não existe ou foi removido. Volte para a lista e escolha outro programa."
      >
        {program ? (
          <div className="flex flex-col gap-4">
            <section
              aria-label="Cabeçalho do programa"
              className="rounded-lg border bg-card p-6 shadow-sm flex flex-col gap-2"
            >
              <h2 className="font-display text-2xl leading-snug text-[#B7602B] tracking-wider">
                {program.title}
              </h2>
              <p className="text-sm text-muted-foreground">{program.owner}</p>
              <span className="text-xs rounded border px-1.5 py-0.5 w-fit">
                {STATUS_LABEL[program.status]}
              </span>
            </section>

            {successNotice ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {successNotice}
              </div>
            ) : null}

            {readOnly ? null : (
              <div className="flex justify-end">
                <Button type="button" onClick={openCreateModal}>
                  Adicionar treino
                </Button>
              </div>
            )}

            <WorkoutList
              items={workouts}
              subtitles={subtitles}
              programId={id}
              loading={workoutsLoading}
              error={workoutsError}
              errorOrigin={workoutsOrigin}
              empty={workouts.length === 0}
              readOnly={readOnly}
              onRename={handleRename}
              onDelete={handleDelete}
              onRetry={() => void retryWorkouts()}
            />

            <WorkoutModal
              open={modalOpen}
              mode={modalMode}
              defaultName={defaultName}
              otherNames={otherNames}
              saving={saving}
              errorMsg={modalError}
              onClose={closeModal}
              onSave={handleModalSave}
            />
          </div>
        ) : null}
      </AsyncState>
    </MilonLayout>
  );
}
