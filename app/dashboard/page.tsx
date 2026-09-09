"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import { Button } from "@/components/ui/button";
import { HestiaLayout } from "@/components/layout/HestiaLayout";
import { getBudgetAdjustment } from "@/lib/pluto/db/budget";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const db = useMemo(() => createBrowserDatabaseClient(), []);

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
        const revision = await getBudgetAdjustment(db, year);
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
  }, [supabase, db]);

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
    <HestiaLayout pageTitle="Painel de Ferramentas" pageSubtitle="Acesse seus utilitários familiares." dataState={dataState}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <Link
          href="/pluto/budget"
          className="group relative overflow-hidden flex flex-col gap-2 rounded-lg border p-6 hover:bg-muted/40 transition-colors"
        >
          <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none" style={{
            backgroundImage: 'url("/mascots/pluto.png")',
            backgroundPosition: 'center right',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'auto 120%',
            filter: 'sepia(1) saturate(5) hue-rotate(-20deg)',
          }} />
          <div className="relative z-10 flex flex-col gap-2">
            <h2 className="text-3xl font-['CaesarDressing'] text-[#EC5223] tracking-wider group-hover:text-[#FF8C42] transition-colors">
              Pluto
            </h2>
            <p className="text-sm text-muted-foreground">
              Acesse o controle de orçamento anual, categorias de receitas e despesas previstas.
            </p>
          </div>
        </Link>
      </div>
    </HestiaLayout>
  );
}