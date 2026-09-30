"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { Home, LogOut } from "lucide-react";

export interface ModuleLayoutProps {
  mascot: string;
  moduleName: string;
  color: string;
  navItems?: { href: string; label: string }[];
  pageTitle?: string;
  pageSubtitle?: string;
  children: ReactNode;
}

export function ModuleLayout({
  mascot,
  moduleName,
  color,
  navItems = [],
  pageTitle,
  pageSubtitle,
  children,
}: ModuleLayoutProps) {
  const supabase = createClient();
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 pt-2">
      {/* Topo: Ações globais (Dashboard + Logout) alinhados à direita */}
      <div className="flex justify-end gap-2 mb-2">
        {!isDashboard && (
          <Link href="/dashboard" className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Voltar ao Dashboard">
            <Home className="w-5 h-5" />
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Topo: Mascote + Título do Módulo (grande) */}
      <div className="flex items-center gap-3 mb-1">
        <img
          src={mascot}
          alt={`${moduleName} mascote`}
          style={{ flexShrink: 0 }}
        />
        <h1 className="text-9xl font-display tracking-wider" style={{ color }}>
          {moduleName}
        </h1>
      </div>

      {/* Barra de navegação do módulo (quando houver) */}
      {navItems.length > 0 && (
        <nav className="flex border-b pb-1 gap-6 mb-4" role="navigation" aria-label={`Navegação do módulo ${moduleName}`}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname?.startsWith(item.href + "/") ?? false);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "pb-2 text-sm font-display tracking-wider hover:text-current border-b-2 font-semibold"
                    : "pb-2 text-sm font-display tracking-wider hover:text-current"
                }
                style={{ color }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Header da página: Título + Subtítulo */}
      {(pageTitle || pageSubtitle) && (
        <header className="flex flex-col items-start gap-1 border-b pb-4 mb-6">
          {pageTitle && (
            <h1 className="text-3xl font-display tracking-wider" style={{ color }}>
              {pageTitle}
            </h1>
          )}
          {pageSubtitle && (
            <p className="text-lg text-muted-foreground">{pageSubtitle}</p>
          )}
        </header>
      )}

      {/* Conteúdo da página */}
      <main>{children}</main>
    </div>
  );
}