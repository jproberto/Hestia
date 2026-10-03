"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import {
  listProgramsStandalone,
  createProgramStandalone,
  updateProgramStandalone,
  deleteProgramStandalone,
} from "@/lib/milon/db/programs";
import {
  hasWorkoutsStandalone,
  hasWorkoutWithExerciseStandalone,
} from "@/lib/milon/db/workouts";
import {
  aplicarEfeitoColateralAtivacao,
  guardaAtivacao,
  normalizarTitulo,
  validarTitulo,
} from "@/lib/milon/program-utils";
import { MSG_PROGRAMA_COM_TREINOS } from "@/lib/milon/workout-utils";
import type { Program, ProgramErrorOrigin, ProgramStatus } from "@/lib/milon/types";

export type ProgramConfirmAction = "ativar" | "reativar" | "excluir";

export interface ProgramConfirmState {
  action: ProgramConfirmAction;
  program: Program;
}

export interface SaveProgramInput {
  title: string;
}

export interface UseProgramsReturn {
  programs: Program[];
  filteredPrograms: Program[];
  ownerFilter: string;
  statusFilters: ProgramStatus[];
  loading: boolean;
  errorMsg: string | null;
  errorOrigin: ProgramErrorOrigin | null;
  confirmAction: ProgramConfirmState | null;
  setOwnerFilter: (value: string) => void;
  toggleStatusFilter: (status: ProgramStatus) => void;
  reload: () => Promise<void>;
  retry: () => Promise<void>;
  refetch: () => Promise<void>;
  save: (input: SaveProgramInput | string, id?: string | null) => Promise<Program>;
  activate: (program: Program) => Promise<void>;
  reactivate: (program: Program) => Promise<void>;
  remove: (program: Program) => Promise<void>;
  requestConfirm: (action: ProgramConfirmAction, program: Program) => void;
  cancelConfirm: () => void;
  confirm: () => Promise<void>;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// Fetch+estado no padrão do projeto (promise-chain + flag cancelled no mount;
// operações via barrels `db/programs` + `db/workouts` + puras de `program-utils.ts`).
export function usePrograms(): UseProgramsReturn {
  const db = useMemo(() => createBrowserDatabaseClient(), []);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [ownerFilter, setOwnerFilterState] = useState<string>("");
  const [statusFilters, setStatusFilters] = useState<ProgramStatus[]>([
    "rascunho",
    "ativo",
    "inativo",
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorOrigin, setErrorOrigin] = useState<ProgramErrorOrigin | null>(null);
  const [confirmAction, setConfirmAction] = useState<ProgramConfirmState | null>(null);
  const confirmRef = useRef<ProgramConfirmState | null>(null);

  useEffect(() => {
    confirmRef.current = confirmAction;
  }, [confirmAction]);

  useEffect(() => {
    let cancelled = false;
    listProgramsStandalone().then(
      (items) => {
        if (cancelled) return;
        setPrograms(items ?? []);
        setErrorMsg(null);
        setErrorOrigin(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setErrorMsg(toErrorMessage(err, "Erro ao carregar programas"));
        setErrorOrigin("carga");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    db.getUserEmail().then(
      (email) => {
        if (cancelled) return;
        if (email) setOwnerFilterState(email);
      },
      () => {
        // Sem email: mantém "" (família inteira), sem erro.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [db]);

  const setOwnerFilter = useCallback((value: string) => {
    setOwnerFilterState(value);
  }, []);

  const toggleStatusFilter = useCallback((status: ProgramStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  }, []);

  const filteredPrograms = useMemo(
    () =>
      programs.filter((program) => {
        const ownerOk = ownerFilter === "" || program.owner === ownerFilter;
        if (!ownerOk) return false;
        return statusFilters.includes(program.status);
      }),
    [programs, ownerFilter, statusFilters],
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setErrorOrigin(null);
    try {
      const items = await listProgramsStandalone();
      setPrograms(items ?? []);
      setErrorMsg(null);
      setErrorOrigin(null);
    } catch (err: unknown) {
      setErrorMsg(toErrorMessage(err, "Erro ao carregar programas"));
      setErrorOrigin("carga");
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => fetchList(), [fetchList]);

  const resolveOwner = useCallback(async (): Promise<string> => {
    if (ownerFilter !== "") return ownerFilter;
    const email = await db.getUserEmail();
    return email ?? "";
  }, [db, ownerFilter]);

  const save = useCallback(
    async (input: SaveProgramInput | string, id?: string | null): Promise<Program> => {
      // Erro de save NÃO alimenta o `errorMsg`/`errorOrigin` da lista: ele é
      // relançado para o modal exibir (padrão useExercises). save() não grava
      // em nenhum dos dois campos — nem em falha, nem em sucesso.
      // A lista preserva itens/filtros; só fetch (fetchList) toca no canal.
      const rawTitle = typeof input === "string" ? input : input.title;
      const normalized = normalizarTitulo(rawTitle);
      const validationError = validarTitulo(normalized);
      if (validationError) {
        throw new Error(validationError);
      }
      try {
        let saved: Program;
        if (id) {
          saved = await updateProgramStandalone(id, { title: normalized });
        } else {
          saved = await createProgramStandalone({
            title: normalized,
            owner: await resolveOwner(),
            status: "rascunho",
          });
        }
        try {
          const items = await listProgramsStandalone();
          setPrograms(items ?? []);
        } catch {
          // Recarga falhou: atualiza em memória para não perder o save.
          setPrograms((prev) => {
            if (id) {
              return prev.map((p) => (p.id === id ? saved : p));
            }
            return [saved, ...prev];
          });
        }
        return saved;
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao salvar programa");
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [resolveOwner],
  );

  const runActivation = useCallback(
    async (program: Program): Promise<void> => {
      let temConteudo: boolean;
      try {
        temConteudo = await hasWorkoutWithExerciseStandalone(program.id);
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao verificar treinos do programa");
        setErrorMsg(message);
        setErrorOrigin("operacao");
        throw err instanceof Error ? err : new Error(message);
      }
      const bloqueio = guardaAtivacao(temConteudo);
      if (bloqueio) {
        setErrorMsg(bloqueio);
        setErrorOrigin("bloqueio");
        throw new Error(bloqueio);
      }
      setErrorMsg(null);
      setErrorOrigin(null);
      try {
        await updateProgramStandalone(program.id, { status: "ativo" });
        // Efeito colateral via program-utils (não depende de refetch):
        // desativa o anterior do mesmo dono em memória e ativa o alvo.
        setPrograms((prev) => {
          const desativados = aplicarEfeitoColateralAtivacao(prev, program.owner);
          return desativados.map((p) =>
            p.id === program.id ? { ...p, status: "ativo" as const } : p,
          );
        });
        setErrorMsg(null);
        setErrorOrigin(null);
      } catch (err: unknown) {
        const message = toErrorMessage(err, "Erro ao atualizar programa");
        setErrorMsg(message);
        setErrorOrigin("operacao");
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [],
  );

  const activate = useCallback(
    (program: Program) => runActivation(program),
    [runActivation],
  );

  const reactivate = useCallback(
    (program: Program) => runActivation(program),
    [runActivation],
  );

  const remove = useCallback(async (program: Program): Promise<void> => {
    if (program.status !== "rascunho") {
      const message = "Somente programas em rascunho podem ser excluídos";
      setErrorMsg(message);
      setErrorOrigin("bloqueio");
      throw new Error(message);
    }
    let comTreinos: boolean;
    try {
      comTreinos = await hasWorkoutsStandalone(program.id);
    } catch (err: unknown) {
      const message = toErrorMessage(err, "Erro ao verificar treinos do programa");
      setErrorMsg(message);
      setErrorOrigin("operacao");
      throw err instanceof Error ? err : new Error(message);
    }
    if (comTreinos) {
      setErrorMsg(MSG_PROGRAMA_COM_TREINOS);
      setErrorOrigin("bloqueio");
      throw new Error(MSG_PROGRAMA_COM_TREINOS);
    }
    setErrorMsg(null);
    setErrorOrigin(null);
    try {
      await deleteProgramStandalone(program.id);
    } catch (err: unknown) {
      const message = toErrorMessage(err, "Erro ao excluir programa");
      setErrorMsg(message);
      setErrorOrigin("operacao");
      throw err instanceof Error ? err : new Error(message);
    }
    try {
      const items = await listProgramsStandalone();
      setPrograms(items ?? []);
    } catch {
      setPrograms((prev) => prev.filter((p) => p.id !== program.id));
    }
    setErrorMsg(null);
    setErrorOrigin(null);
  }, []);

  const requestConfirm = useCallback(
    (action: ProgramConfirmAction, program: Program) => {
      const next: ProgramConfirmState = { action, program };
      confirmRef.current = next;
      setConfirmAction(next);
    },
    [],
  );

  const cancelConfirm = useCallback(() => {
    confirmRef.current = null;
    setConfirmAction(null);
  }, []);

  const confirm = useCallback(async (): Promise<void> => {
    const pending = confirmRef.current ?? confirmAction;
    if (!pending) return;
    try {
      if (pending.action === "ativar") {
        await runActivation(pending.program);
      } else if (pending.action === "reativar") {
        await runActivation(pending.program);
      } else {
        await remove(pending.program);
      }
    } finally {
      confirmRef.current = null;
      setConfirmAction(null);
    }
  }, [confirmAction, runActivation, remove]);

  return {
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
    reload,
    retry: reload,
    refetch: reload,
    save,
    activate,
    reactivate,
    remove,
    requestConfirm,
    cancelConfirm,
    confirm,
  };
}
