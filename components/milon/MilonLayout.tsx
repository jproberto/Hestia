"use client";

import { ReactNode } from "react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";

export interface MilonLayoutProps {
  pageTitle?: string;
  pageSubtitle?: string;
  children: ReactNode;
}

export function MilonLayout({ pageTitle, pageSubtitle, children }: MilonLayoutProps) {
  const milonNavItems: { href: string; label: string }[] = [
    { href: "/milon/today", label: "Treino do Dia" },
    { href: "/milon/programs", label: "Programas" },
    { href: "/milon/exercises", label: "Exercícios" },
  ];

  return (
    <ModuleLayout
      mascot="/mascots/milon.png"
      moduleName="Mílon"
      color="#B7602B"
      navItems={milonNavItems}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
    >
      {children}
    </ModuleLayout>
  );
}
