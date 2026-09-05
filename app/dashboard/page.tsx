"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { getBudgetAdjustment } from "@/lib/pluto/db/budget";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [dataState, setDataState] = useState<'loading' | 'empty' | 'error' | 'has-data'>('loading');

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          if (mounted) setDataState('empty');
          return;
        }
        const year = new Date().getFullYear();
        const revision = await getBudgetAdjustment(supabase, year);
        if (mounted) {
          setDataState(revision ? 'has-data' : 'empty');
        }
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
        if (mounted) setDataState('error');
      }
    }
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [supabase]);

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
      <header className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <img
            src="/mascots/hestia.png"
            alt="Hestia mascote"
            className="h-16 w-16 object-cover"
            style={{ flexShrink: 0 }}
          />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel de Ferramentas</h1>
            <p className="text-sm text-muted-foreground">Acesse seus utilitários familiares.</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          Sair 🚪
        </Button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/pluto/budget"
          className="group flex flex-col gap-2 rounded-lg border p-6 hover:bg-muted/40 transition-colors"
        >
          <h2 className="text-lg font-bold group-hover:text-primary transition-colors">
            Pluto 💰
          </h2>
          <p className="text-sm text-muted-foreground">
            Acesse o controle de orçamento anual, categorias de receitas e despesas previstas.
          </p>
        </Link>
      </div>
    </div>
  );
}