"use client";

import Link from "next/link";
import { HestiaLayout } from "@/components/layout/HestiaLayout";

export default function DashboardPage() {
  return (
    <HestiaLayout pageTitle="Painel de Ferramentas" pageSubtitle="Acesse seus utilitários familiares.">
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
