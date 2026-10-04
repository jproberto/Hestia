"use client";

import { useParams } from "next/navigation";
import { WorkoutDetailSection } from "@/components/milon/WorkoutDetailSection";

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

  return (
    <WorkoutDetailSection
      workoutId={workoutId}
      backTarget={{ kind: "program", programId: id }}
    />
  );
}
