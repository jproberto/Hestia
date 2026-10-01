"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AsyncState } from "@/components/ui/AsyncState";
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

      <AsyncState
        loading={loading}
        error={error}
        errorOrigin={errorOrigin}
        empty={empty}
        noResults={noResults}
        onRetry={onRetry}
        loadingText="Carregando programas..."
        emptyTitle="Nenhum programa ainda."
        emptyText="Crie o primeiro programa para começar."
        noResultsTitle="Nada encontrado para essa combinação."
        noResultsText="Ajuste os filtros para ver mais programas."
      >
        {items.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
          {items.map((program) => (
            <li
              key={program.id}
              className="rounded-lg border bg-card text-card-foreground shadow-sm px-3 py-2 flex items-center justify-between gap-2"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <h3 className="font-display text-sm leading-snug tracking-wider truncate">
                  <Link
                    href={"/milon/programs/" + program.id}
                    className="text-[#B7602B] hover:text-[#C2703D] transition-colors no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7602B]"
                  >
                    {program.title}
                  </Link>
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
        ) : null}
      </AsyncState>
    </section>
  );
}
