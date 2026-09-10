"use client";

export interface BudgetEmptyStateProps {
  year: number;
  onStart: () => void;
}

/**
 * Estado vazio da página de orçamento (sem revisão para o ano).
 * Extraído de BudgetPage sem mudança visual.
 */
export default function BudgetEmptyState({ year, onStart }: BudgetEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center">
      <h3 className="text-xl font-['CaesarDressing'] text-[#35472D] tracking-wider">Nenhum orçamento cadastrado para o ano {year}.</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Crie um orçamento inicial para começar a cadastrar suas receitas e despesas previstas.
      </p>
      <button className="rounded bg-[#35472D] px-4 py-2 text-white hover:bg-[#2a3a24] transition-colors" onClick={onStart}>
        Iniciar Orçamento de {year}
      </button>
    </div>
  );
}
