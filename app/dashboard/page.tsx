"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel de Ferramentas</h1>
          <p className="text-sm text-muted-foreground">Acesse seus utilitários familiares.</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          Sair 🚪
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <Link
          href="/finance/months"
          className="group flex flex-col gap-2 rounded-lg border p-6 hover:bg-muted/40 transition-colors"
        >
          <h2 className="text-lg font-bold group-hover:text-primary transition-colors">
            Meses e Períodos 📅
          </h2>
          <p className="text-sm text-muted-foreground">
            Abra e encerre períodos mensais para permitir novos lançamentos e travar edições.
          </p>
        </Link>
      </div>
    </div>
  );
}
