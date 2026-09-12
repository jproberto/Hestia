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
    // Adicione itens de navegação do módulo aqui
    // { href: "/milon/exemplo", label: "Exemplo" },
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
