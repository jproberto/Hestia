"use client";

import { useParams } from "next/navigation";
import { MilonLayout } from "@/components/milon/MilonLayout";
import { Button } from "@/components/ui/button";
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
      {loading ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          Carregando programa…
        </p>
      ) : error ? (
        <div className="rounded-lg border bg-card p-8 text-center shadow-sm flex flex-col items-center gap-2">
          <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void retry()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : program === null ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm shadow-sm flex flex-col items-center gap-2">
          <p className="font-display text-[#B7602B] tracking-wider">
            Programa não encontrado.
          </p>
          <p className="text-muted-foreground">
            Este programa não existe ou foi removido. Volte para a lista e
            escolha outro programa.
          </p>
        </div>
      ) : (
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
      )}
    </MilonLayout>
  );
}
