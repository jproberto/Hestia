"use client";

import { useParams } from "next/navigation";
import { MilonLayout } from "@/components/milon/MilonLayout";
import { AsyncState } from "@/components/ui/AsyncState";
import { useProgramDetail } from "@/lib/milon/hooks/useProgramDetail";
import { STATUS_LABEL } from "@/lib/milon/program-utils";

function resolveId(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

export default function ProgramDetailPage() {
  const params = useParams();
  const id = resolveId(params?.id as string | string[] | undefined);
  const { program, loading, error, retry } = useProgramDetail(id);

  return (
    <MilonLayout pageTitle="Programa">
      <AsyncState
        loading={loading}
        error={error}
        empty={program === null}
        noResults={false}
        onRetry={() => void retry()}
        loadingText="Carregando programa…"
        emptyTitle="Programa não encontrado."
        emptyText="Este programa não existe ou foi removido. Volte para a lista e escolha outro programa."
      >
        {program ? (
          <section
            aria-label="Cabeçalho do programa"
            className="rounded-lg border bg-card p-6 shadow-sm flex flex-col gap-2"
          >
            <h2 className="font-display text-2xl leading-snug text-[#B7602B] tracking-wider">
              {program.title}
            </h2>
            <p className="text-sm text-muted-foreground">{program.owner}</p>
            <span className="text-xs rounded border px-1.5 py-0.5 w-fit">
              {STATUS_LABEL[program.status]}
            </span>
          </section>
        ) : null}
      </AsyncState>
    </MilonLayout>
  );
}
