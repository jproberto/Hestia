"use client";

import { MascotProvider } from "@/lib/hestia/MascotProvider";
import { ReactNode } from "react";

export default function MilonLayout({ children }: { children: ReactNode }) {
  return <MascotProvider mascotKey="milon">{children}</MascotProvider>;
}
