"use client";

import { useCallback, useMemo, useState } from "react";
import { MilonLayout } from "@/components/milon/MilonLayout";
import ProgramList from "@/components/milon/ProgramList";
import ProgramModal from "@/components/milon/ProgramModal";
import ProgramConfirmModal from "@/components/milon/ProgramConfirmModal";
import { Button } from "@/components/ui/button";
import { usePrograms, type ProgramConfirmAction } from "@/lib/milon/hooks/usePrograms";
import { sortearSugestao } from "@/lib/milon/program-utils";
import type { Program } from "@/lib/milon/types";

function toMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

interface LocalConfirm {
  action: ProgramConfirmAction;
  program: Program;
}

/**
 * Tela de Programas (Mílon #2).
 * Enxuta: só composição + modais. Todo fetch/estado/operações vive
 * em `usePrograms`; sorteio de sugestão via `sortearSugestao()`.
 */
export default function ProgramsPage() {
  const {
    programs,
    filteredPrograms,
    ownerFilter,
    statusFilters,
    loading,
    errorMsg,
    errorOrigin,
    confirmAction,
    setOwnerFilter,
    toggleStatusFilter,
    retry,
    save,
    activate,
    reactivate,
    remove,
    requestConfirm,
    cancelConfirm,
    confirm,
  } = usePrograms();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [localConfirm, setLocalConfirm] = useState<LocalConfirm | null>(null);
  const [processing, setProcessing] = useState(false);

  const ownerOptions = useMemo(
    () => Array.from(new Set(programs.map((program) => program.owner))),
    [programs],
  );

  const empty = programs.length === 0;
  const noResults = programs.length > 0 && filteredPrograms.length === 0;

  const openCreateModal = useCallback(() => {
    setEditingProgram(null);
    setSuggestion(sortearSugestao());
    setModalError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingProgram(null);
    setModalError(null);
  }, []);

  const handleEdit = useCallback((program: Program) => {
    setEditingProgram(program);
    setModalError(null);
    setModalOpen(true);
  }, []);

  const handleActivateReactivate = useCallback(
    (program: Program) => {
      const action: ProgramConfirmAction =
        program.status === "inativo" ? "reativar" : "ativar";
      setLocalConfirm({ action, program });
      try {
        requestConfirm(action, program);
      } catch {
        // Guarda local já cobre a abertura; falha do hook não bloqueia.
      }
    },
    [requestConfirm],
  );

  const handleDeleteRequest = useCallback(
    (program: Program) => {
      setLocalConfirm({ action: "excluir", program });
      try {
        requestConfirm("excluir", program);
      } catch {
        // Guarda local já cobre a abertura; falha do hook não bloqueia.
      }
    },
    [requestConfirm],
  );

  const handleModalSave = useCallback(
    async (title: string): Promise<void> => {
      setSaving(true);
      setModalError(null);
      try {
        if (editingProgram) {
          await save(title, editingProgram.id);
        } else {
          await save(title);
        }
        setModalOpen(false);
        setEditingProgram(null);
      } catch (err: unknown) {
        // Nunca fecha no erro: registra mensagem visível e relança para
        // o modal preservar o digitado (padrão homologado).
        const message = toMessage(err, "Erro ao salvar programa");
        setModalError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [editingProgram, save],
  );

  const effectiveConfirm: LocalConfirm | null = localConfirm ?? confirmAction ?? null;

  const handleConfirm = useCallback(async (): Promise<void> => {
    const target = effectiveConfirm;
    if (!target) return;
    setProcessing(true);
    try {
      if (localConfirm) {
        if (target.action === "ativar") {
          await activate(target.program);
        } else if (target.action === "reativar") {
          await reactivate(target.program);
        } else {
          await remove(target.program);
        }
        setLocalConfirm(null);
        try {
          cancelConfirm();
        } catch {
          // Limpeza do hook é complementar; o fechamento local já ocorreu.
        }
      } else {
        await confirm();
      }
    } catch {
      // Mantém a confirmação aberta; o erro fica visível na lista via hook.
    } finally {
      setProcessing(false);
    }
  }, [effectiveConfirm, localConfirm, activate, reactivate, remove, cancelConfirm, confirm]);

  const handleConfirmCancel = useCallback(() => {
    if (!processing) {
      setLocalConfirm(null);
      try {
        cancelConfirm();
      } catch {
        // Fechamento local já ocorreu.
      }
    }
  }, [processing, cancelConfirm]);

  return (
    <MilonLayout pageTitle="Programas" pageSubtitle="Organize seus treinos em ciclos">
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button type="button" onClick={openCreateModal}>
            Novo programa
          </Button>
        </div>

        <ProgramList
          items={filteredPrograms}
          ownerOptions={ownerOptions}
          selectedOwner={ownerFilter}
          selectedStatuses={statusFilters}
          loading={loading}
          error={errorMsg}
          errorOrigin={errorOrigin ?? "carga"}
          empty={empty}
          noResults={noResults}
          onChangeOwner={setOwnerFilter}
          onChangeStatus={toggleStatusFilter}
          onEdit={handleEdit}
          onActivateReactivate={handleActivateReactivate}
          onDelete={handleDeleteRequest}
          onRetry={retry}
        />

        <ProgramModal
          open={modalOpen}
          program={editingProgram}
          suggestion={suggestion}
          saving={saving}
          errorMsg={modalError}
          successMsg={null}
          onClose={closeModal}
          onSave={handleModalSave}
        />

        <ProgramConfirmModal
          open={effectiveConfirm !== null}
          action={effectiveConfirm?.action ?? "ativar"}
          title={effectiveConfirm?.program.title ?? ""}
          owner={effectiveConfirm?.program.owner ?? ""}
          processing={processing}
          onConfirm={() => void handleConfirm()}
          onCancel={handleConfirmCancel}
        />
      </div>
    </MilonLayout>
  );
}
