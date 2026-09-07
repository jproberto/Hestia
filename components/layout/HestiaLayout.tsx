"use client";

import { ReactNode } from "react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";

export interface HestiaLayoutProps {
  pageTitle?: string;
  pageSubtitle?: string;
  children: ReactNode;
}

export function HestiaLayout({ pageTitle, pageSubtitle, children }: HestiaLayoutProps) {
  return (
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
  );
}