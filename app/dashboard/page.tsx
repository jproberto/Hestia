import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Painel de Ferramentas</h1>
        <p className="text-sm text-muted-foreground">Acesse seus utilitários familiares.</p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Link
          href="/finance/budget"
          className="group flex flex-col gap-2 rounded-lg border p-6 hover:bg-muted/40 transition-colors"
        >
          <h2 className="text-lg font-bold group-hover:text-primary transition-colors">
            Héstia Financeira 💰
          </h2>
          <p className="text-sm text-muted-foreground">
            Acesse o controle de orçamento anual, categorias de receitas e despesas previstas.
          </p>
        </Link>
      </div>
    </div>
  );
}
