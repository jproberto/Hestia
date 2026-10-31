"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ErrorOrigin } from "@/lib/shared";

export interface AsyncStateProps {
  loading?: boolean;
  error?: string | null;
  errorOrigin?: ErrorOrigin | null;
  empty?: boolean;
  noResults?: boolean;
  onRetry?: () => void;
  loadingText?: string;
  emptyTitle?: string;
  emptyText?: string;
  noResultsTitle?: string;
  noResultsText?: string;
  children?: ReactNode;
}

/**
 * Estado centralizado das telas de lista (Mílon #2, Patch v5).
 * Cobre os 4 estados — carregando, erro, vazio, no-results — com precedência
 * fixa D19: loading sozinho; erro como banner ACIMA do conteúdo (nunca o
 * substitui); empty prevalece sobre noResults. O retry deriva de errorOrigin
 * dentro do componente: origem ausente/nula vale `carga`.
 */
export function AsyncState({
  loading = false,
  error = null,
  errorOrigin = null,
  empty = false,
  noResults = false,
  onRetry,
  loadingText = "Carregando...",
  emptyTitle = "Nenhum item ainda.",
  emptyText = "Crie o primeiro item para começar.",
  noResultsTitle = "Nada encontrado para essa combinação.",
  noResultsText = "Ajuste os filtros para ver mais itens.",
  children,
}: AsyncStateProps) {
  if (loading) {
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        {loadingText}
      </p>
    );
  }

  if (error) {
    const origin = errorOrigin ?? "carga";
    return (
      <>
        <div className="rounded-lg border bg-card p-8 text-center shadow-sm flex flex-col items-center gap-2">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          {origin === "carga" ? (
            <Button onClick={onRetry} size="sm" variant="outline">
              Tentar novamente
            </Button>
          ) : null}
        </div>
        {children ?? null}
      </>
    );
  }

  if (empty) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm shadow-sm flex flex-col items-center gap-2">
        <p className="font-medium">{emptyTitle}</p>
        <p className="text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  if (noResults) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm shadow-sm flex flex-col items-center gap-2">
        <p className="font-medium">{noResultsTitle}</p>
        <p className="text-muted-foreground">{noResultsText}</p>
      </div>
    );
  }

  if (children) {
    return <>{children}</>;
  }

  return null;
}

export default AsyncState;
