"use client";

import { Button } from "@/components/ui/button";
import { STATUS_LABEL } from "@/lib/milon/program-utils";
import type { Program, ProgramErrorOrigin, ProgramStatus } from "@/lib/milon/types";

export interface ProgramListProps {
  items: Program[];
  ownerOptions: string[];
  selectedOwner: string;
  selectedStatuses: ProgramStatus[];
  loading: boolean;
  error: string | null;
  errorOrigin: ProgramErrorOrigin | null;
  empty: boolean;
  noResults: boolean;
  onChangeOwner: (owner: string) => void;
  onChangeStatus: (status: ProgramStatus) => void;
  onEdit: (program: Program) => void;
  onActivateReactivate: (program: Program) => void;
  onDelete: (program: Program) => void;
  onRetry: () => void;
}

const ALL_STATUSES: ProgramStatus[] = ["rascunho", "ativo", "inativo"];

/**
 * Lista presentacional de Programas (Mílon #2).
 * Sem fetch: recebe itens filtrados, filtros atuais e estados via props.
 */
export default function ProgramList({
  items,
  ownerOptions,
  selectedOwner,
  selectedStatuses,
  loading,
  error,
  errorOrigin,
  empty,
  noResults,
  onChangeOwner,
  onChangeStatus,
  onEdit,
  onActivateReactivate,
  onDelete,
  onRetry,
}: ProgramListProps) {
  return (
    <section className="flex flex-col gap-3" aria-label="Programas">
      <h2 className="text-xl font-display text-[#B7602B] tracking-wider">Programas</h2>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-display tracking-wider">Filtrar por dono</span>
          <select
            aria-label="Filtrar por dono"
            value={selectedOwner}
            onChange={(event) => onChangeOwner(event.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Família inteira</option>
            {ownerOptions.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex flex-1 flex-col gap-1 text-sm">
          <legend className="font-display tracking-wider">Filtrar por status</legend>
          <div className="flex gap-3">
            {ALL_STATUSES.map((status) => (
              <label key={status} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(status)}
                  onChange={() => onChangeStatus(status)}
                />
                {STATUS_LABEL[status]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {loading ? (
        <p className="p-8 text-center text-sm font-display text-[#B7602B] tracking-wider">
          Carregando programas...
        </p>
      ) : error ? (
        <div className="rounded-lg border bg-card p-8 text-center shadow-sm flex flex-col items-center gap-2">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          {errorOrigin === "carga" ? (
            <Button onClick={onRetry} size="sm" variant="outline">
              Tentar novamente
            </Button>
          ) : null}
        </div>
      ) : empty ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm shadow-sm flex flex-col items-center gap-2">
          <p className="font-display text-[#B7602B] tracking-wider">
            Nenhum programa ainda.
          </p>
          <p className="text-muted-foreground">
            Crie o primeiro programa para começar.
          </p>
        </div>
      ) : noResults ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm shadow-sm flex flex-col items-center gap-2">
          <p className="font-display text-[#B7602B] tracking-wider">
            Nada encontrado para essa combinação.
          </p>
          <p className="text-muted-foreground">
            Ajuste os filtros para ver mais programas.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((program) => (
            <li
              key={program.id}
              className="rounded-lg border bg-card text-card-foreground shadow-sm px-3 py-2 flex items-center justify-between gap-2"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <h3 className="font-display text-sm leading-snug text-[#B7602B] tracking-wider truncate">
                  {program.title}
                </h3>
                <span className="text-xs text-muted-foreground">{program.owner}</span>
                <span className="text-xs rounded border px-1.5 py-0.5 w-fit">
                  {STATUS_LABEL[program.status]}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {program.status !== "inativo" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(program)}
                  >
                    Editar
                  </Button>
                ) : null}
                {program.status === "rascunho" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onActivateReactivate(program)}
                  >
                    Ativar
                  </Button>
                ) : null}
                {program.status === "inativo" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onActivateReactivate(program)}
                  >
                    Reativar
                  </Button>
                ) : null}
                {program.status === "rascunho" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(program)}
                  >
                    Excluir
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
