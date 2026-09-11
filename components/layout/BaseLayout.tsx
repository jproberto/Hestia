"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ModuleConfig } from "@/lib/modules";

interface BaseLayoutProps {
  config: {
    name: string;
    mascot: string;
    color: string;
  };
  topHeader?: React.ReactNode;      // mascote + título do módulo (no topo)
  nav?: React.ReactNode;            // abas, breadcrumbs
  pageHeader?: React.ReactNode;     // header da página específica
  children: React.ReactNode;
}

export function BaseLayout({
  config,
  topHeader,
  nav,
  pageHeader,
  children,
}: BaseLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      {/* Topo: mascote + título do módulo */}
      {topHeader && (
        <div className="flex items-center gap-3 mb-2">
          <img
            src={config.mascot}
            alt={`${config.name} mascote`}
            className="h-96 w-96 object-cover"
            style={{ flexShrink: 0 }}
          />
          <h1 className="text-3xl font-display tracking-wider" style={{ color: config.color }}>
            {config.name}
          </h1>
        </div>
      )}

      {/* Navegação do módulo (abas, breadcrumbs) */}
      {nav && (
        <nav className="flex border-b pb-1 gap-6 mb-4" role="navigation" aria-label="Navegação do módulo">
          {nav}
        </nav>
      )}

      {/* Header da página específica */}
      {pageHeader && (
        <header className="flex flex-col items-start gap-1 border-b pb-4 mb-6">
          {pageHeader}
        </header>
      )}

      {/* Conteúdo principal */}
      <main>{children}</main>
    </div>
  );
}

export function TopHeader({ config }: { config: { name: string; mascot: string; color: string } }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <img
        src={`/mascots/${config.name.toLowerCase()}.png`}
        alt={`${config.name} mascote`}
        className="h-96 w-96 object-cover"
        style={{ flexShrink: 0 }}
      />
      <h1 className="text-3xl font-display tracking-wider" style={{ color: config.color }}>
        {config.name}
      </h1>
    </div>
  );
}

export function ModuleNav({ children }: { children: React.ReactNode }) {
  return (
    <nav className="flex border-b pb-1 gap-6 mb-4" role="navigation" aria-label="Navegação do módulo">
      {children}
    </nav>
  );
}

export function PageHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex flex-col items-start gap-1 border-b pb-4 mb-6">
      {children}
    </header>
  );
}

export function PageTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-display tracking-wider" style={{ color: '#35472D' }}>
        {children}
      </h1>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`pb-2 text-sm font-display tracking-wider transition-colors ${
        active
          ? 'text-[#35472D] border-b-2 border-[#35472D]'
          : 'text-[#35472D] hover:text-[#35472D]'
      }`}
    >
      {children}
    </Link>
  );
}

export function PageSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}