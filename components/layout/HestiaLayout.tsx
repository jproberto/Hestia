"use client";

import { ReactNode } from "react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import { MascotProvider, useMascotBackground } from "@/lib/hestia/MascotProvider";
import { MascotBackground } from "@/components/ui/MascotBackground";

export interface HestiaLayoutProps {
  pageTitle?: string;
  pageSubtitle?: string;
  children: ReactNode;
}

function HestiaLayoutContent({ pageTitle, pageSubtitle, children, dataState }: HestiaLayoutProps & { dataState: 'loading' | 'empty' | 'error' | 'has-data' }) {
  const { mode, mascotKey, transitionClass, lqipStyle } = useMascotBackground(dataState);

  return (
    <MascotBackground mode={mode} mascotKey={mascotKey === "pluto" ? "pluto" : "hestia"} className={transitionClass} style={lqipStyle}>
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
    </MascotBackground>
  );
}

export function HestiaLayout({ pageTitle, pageSubtitle, children, dataState = 'loading' }: HestiaLayoutProps & { dataState?: 'loading' | 'empty' | 'error' | 'has-data' }) {
  return (
    <MascotProvider mascotKey="hestia">
      <HestiaLayoutContent pageTitle={pageTitle} pageSubtitle={pageSubtitle} dataState={dataState}>
        {children}
      </HestiaLayoutContent>
    </MascotProvider>
  );
}