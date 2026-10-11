"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MilonLayout } from "@/components/milon/MilonLayout";
import { WorkoutDetailSection } from "@/components/milon/WorkoutDetailSection";
import { findOpenExecutionByWorkoutStandalone } from "@/lib/milon/db/executions";

function resolveParam(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

export default function WorkoutDetailPage() {
  const params = useParams();
  const id = resolveParam(params?.id as string | string[] | undefined);
  const workoutId = resolveParam(
    params?.workoutId as string | string[] | undefined,
  );
  const [execution, setExecution] = useState<unknown | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!workoutId) return () => {
      cancelled = true;
    };
    void Promise.resolve(findOpenExecutionByWorkoutStandalone(workoutId)).then(
      (aberta) => {
        if (!cancelled) setExecution(aberta ?? null);
      },
      () => {
        if (!cancelled) setExecution(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [workoutId]);

  return (
    <MilonLayout pageTitle="Treino">
      <WorkoutDetailSection
        workoutId={workoutId}
        backTarget={{ kind: "program", programId: id }}
        executionBlocked={execution !== null}
      />
    </MilonLayout>
  );
}
