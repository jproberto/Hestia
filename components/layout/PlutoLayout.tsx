"use client";

import { ReactNode } from "react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";

export interface PlutoLayoutProps {
  pageTitle?: string;
  pageSubtitle?: string;
  children: ReactNode;
}

export function PlutoLayout({ pageTitle, pageSubtitle, children }: PlutoLayoutProps) {
  const plutoNavItems = [
    { href: "/pluto/budget", label: "Orçamento Anual" },
    { href: "/pluto/months", label: "Meses e Períodos" },
    { href: "/pluto/transactions", label: "Lançamentos" },
  ];

  return (
    <ModuleLayout
      mascot="/mascots/pluto.png"
      moduleName="Pluto"
      color="#35472D"
      navItems={plutoNavItems}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
    >
      {children}
    </ModuleLayout>
  );
}