"use client";

import { ReactNode } from "react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import { MascotProvider } from "@/lib/hestia/MascotProvider";

export interface HestiaLayoutProps {
  pageTitle?: string;
  pageSubtitle?: string;
  children: ReactNode;
}

export function HestiaLayout({ pageTitle, pageSubtitle, children }: HestiaLayoutProps) {
  return (
    <MascotProvider mascotKey="hestia">
      <ModuleLayout
        mascot="/mascots/hestia.png"
        moduleName="Hestia"
        color="#EC5223"
        navItems={[]}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
      >
        {children}
      </ModuleLayout>
    </MascotProvider>
  );
}
