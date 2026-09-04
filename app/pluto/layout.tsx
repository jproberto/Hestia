"use client";

import { MascotProvider } from "@/lib/hestia/MascotProvider";
import { ReactNode } from "react";

export default function PlutoLayout({ children }: { children: ReactNode }) {
  return <MascotProvider>{children}</MascotProvider>;
}