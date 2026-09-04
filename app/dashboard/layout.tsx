"use client";

import { MascotProvider } from "@/lib/hestia/MascotProvider";
import { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <MascotProvider>{children}</MascotProvider>;
}