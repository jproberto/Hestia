#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../");

function logInfo(msg) {
  console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`);
}

function logWarn(msg) {
  console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`);
}

function logError(msg) {
  console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logInfo(`Created directory: ${path.relative(ROOT_DIR, dirPath)}`);
  }
}

function writeFileIfNotExists(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
    logInfo(`Created file: ${path.relative(ROOT_DIR, filePath)}`);
  } else {
    logWarn(`File already exists, skipping: ${path.relative(ROOT_DIR, filePath)}`);
  }
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  logInfo(`Written file: ${path.relative(ROOT_DIR, filePath)}`);
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toPascalCase(str) {
  return str
    .split("-")
    .map(capitalizeFirst)
    .join("");
}

function toCamelCase(str) {
  return str
    .split("-")
    .map((word, index) => index === 0 ? word.toLowerCase() : capitalizeFirst(word))
    .join("");
}

function quoteKey(key) {
  // Keys with hyphens or other special chars need to be quoted
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 4) {
    logError("Usage: node new-module.js <key> <name> <mascotPath> <color>");
    logError("Example: node new-module.js atlas \"Atlas\" \"/mascots/atlas.png\" \"#123456\"");
    process.exit(1);
  }

  const [key, name, mascotPath, color] = args;
  const pascalName = toPascalCase(key);
  const camelName = toCamelCase(key);
  const quotedKey = quoteKey(key);
  
  // Validate key format (kebab-case, lowercase)
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(key)) {
    logError("Key must be kebab-case (lowercase letters, numbers, hyphens), e.g., 'atlas' or 'my-module'");
    process.exit(1);
  }

  logInfo(`Creating module: ${name} (key: ${key})`);

  // ============================================================
  // 1. Create app/<key>/ structure
  // ============================================================
  const appDir = path.join(ROOT_DIR, "app", key);
  ensureDir(appDir);

  // app/<key>/layout.tsx
  writeFileIfNotExists(
    path.join(appDir, "layout.tsx"),
    `"use client";

import { MascotProvider } from "@/lib/hestia/MascotProvider";
import { ReactNode } from "react";

export default function ${pascalName}Layout({ children }: { children: ReactNode }) {
  return <MascotProvider mascotKey="${key}">{children}</MascotProvider>;
}
`
  );

  // app/<key>/page.tsx (placeholder)
  writeFileIfNotExists(
    path.join(appDir, "page.tsx"),
    `import { ${pascalName}Layout } from "@/components/${key}/${pascalName}Layout";

export default function ${pascalName}Page() {
  return (
    <${pascalName}Layout pageTitle="${name}" pageSubtitle="Página inicial do módulo ${name}">
      <main className="flex flex-col gap-4">
        <p className="text-muted-foreground">
          Módulo ${name} criado com sucesso. Adicione suas páginas aqui.
        </p>
      </main>
    </${pascalName}Layout>
  );
}
`
  );

  // ============================================================
  // 2. Create components/<key>/ structure
  // ============================================================
  const componentsDir = path.join(ROOT_DIR, "components", key);
  ensureDir(componentsDir);

  // components/<key>/<Key>Layout.tsx
  writeFileIfNotExists(
    path.join(componentsDir, `${pascalName}Layout.tsx`),
    `"use client";

import { ReactNode } from "react";
import { ModuleLayout } from "@/components/layout/ModuleLayout";

export interface ${pascalName}LayoutProps {
  pageTitle?: string;
  pageSubtitle?: string;
  children: ReactNode;
}

export function ${pascalName}Layout({ pageTitle, pageSubtitle, children }: ${pascalName}LayoutProps) {
  const ${camelName}NavItems: { href: string; label: string }[] = [
    // Adicione itens de navegação do módulo aqui
    // { href: "/${key}/exemplo", label: "Exemplo" },
  ];

  return (
    <ModuleLayout
      mascot="${mascotPath}"
      moduleName="${name}"
      color="${color}"
      navItems={${camelName}NavItems}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
    >
      {children}
    </ModuleLayout>
  );
}
`
  );

  // components/<key>/<Key>Example.tsx (presentacional + story de exemplo)
  writeFileIfNotExists(
    path.join(componentsDir, `${pascalName}Example.tsx`),
    `"use client";

export interface ${pascalName}ExampleProps {
  name: string;
}

export function ${pascalName}Example({ name }: ${pascalName}ExampleProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-4">
      <p className="text-sm font-medium">{name}</p>
    </div>
  );
}
`
  );

  // components/<key>/<Key>Example.stories.tsx
  writeFileIfNotExists(
    path.join(componentsDir, `${pascalName}Example.stories.tsx`),
    `import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ${pascalName}Example } from "./${pascalName}Example";

const meta: Meta<typeof ${pascalName}Example> = {
  title: "${name}/Example",
  component: ${pascalName}Example,
};

export default meta;
type Story = StoryObj<typeof ${pascalName}Example>;

export const Default: Story = {
  args: { name: "Exemplo ${name}" },
};
`
  );

  // ============================================================
  // 3. Create lib/<key>/ structure (pós-41/47: sem services/, schemas/,
  // use-cases/ — ver Mapa de Camadas no AGENTS.md)
  // ============================================================
  const libDir = path.join(ROOT_DIR, "lib", key);
  ensureDir(libDir);
  ensureDir(path.join(libDir, "repositories"));
  ensureDir(path.join(libDir, "repositories", "fakes"));
  ensureDir(path.join(libDir, "hooks"));
  ensureDir(path.join(libDir, "db"));

  // lib/<key>/types.ts
  writeFileIfNotExists(
    path.join(libDir, "types.ts"),
    `// Types consolidados do módulo ${name} — FONTE ÚNICA (nunca duplicar tipos).
// Ver Mapa de Camadas no AGENTS.md: Row (banco) / Input (repositório) / domínio.

export interface ${pascalName}ItemRow {
  id: string;
  name: string;
  created_at: string;
}

export interface ${pascalName}Item {
  id: string;
  name: string;
  created_at: string;
}

export interface Create${pascalName}Input {
  name: string;
}
`
  );

  // lib/<key>/utils.ts
  writeFileIfNotExists(
    path.join(libDir, "utils.ts"),
    `// Regras puras do módulo ${name} (sem I/O, testadas direto).
// Ver Mapa de Camadas no AGENTS.md.

export function exampleUtil(): string {
  return "${name} utility function";
}
`
  );

  // lib/<key>/repositories/interfaces.ts
  writeFileIfNotExists(
    path.join(libDir, "repositories", "interfaces.ts"),
    `// Contratos de repositório do módulo ${name} (DIP: consumidos via interfaces).
import type { ${pascalName}Item, Create${pascalName}Input } from "../types";

export interface I${pascalName}Repository {
  list(): Promise<${pascalName}Item[]>;
  create(input: Create${pascalName}Input): Promise<${pascalName}Item>;
}
`
  );

  // lib/<key>/repositories/example.ts
  writeFileIfNotExists(
    path.join(libDir, "repositories", "example.ts"),
    `// Acesso a dados do módulo ${name} via IDatabaseClient (nunca @supabase/*).
// Regras de persistência vivem aqui. UI consome via lib/${key}/db/*.
import type { IDatabaseClient } from "@/lib/shared/database";
import { createBrowserDatabaseClient } from "@/lib/shared/supabaseClient";
import type { ${pascalName}Item, ${pascalName}ItemRow, Create${pascalName}Input } from "../types";

export async function listExamples(db: IDatabaseClient): Promise<${pascalName}Item[]> {
  const { data, error } = await db
    .from<${pascalName}ItemRow>("${key}_items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => ({ id: row.id, name: row.name, created_at: row.created_at }));
}

export async function createExample(db: IDatabaseClient, input: Create${pascalName}Input): Promise<${pascalName}Item> {
  const { data, error } = await db
    .from<${pascalName}ItemRow>("${key}_items")
    .insert({ name: input.name.trim() })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error("Falha ao criar item: sem retorno do banco.");
  return { id: data.id, name: data.name, created_at: data.created_at };
}

// Standalones p/ hooks (criam o próprio client, singleton por aba).
export async function listExamplesStandalone(): Promise<${pascalName}Item[]> {
  return listExamples(createBrowserDatabaseClient());
}

export async function createExampleStandalone(input: Create${pascalName}Input): Promise<${pascalName}Item> {
  return createExample(createBrowserDatabaseClient(), input);
}
`
  );

  // lib/<key>/repositories/fakes/example.ts
  writeFileIfNotExists(
    path.join(libDir, "repositories", "fakes", "example.ts"),
    `// Fake em memória de I${pascalName}Repository p/ testes e contracts.
import type { I${pascalName}Repository } from "../interfaces";
import type { ${pascalName}Item, Create${pascalName}Input } from "../../types";

export class Fake${pascalName}Repository implements I${pascalName}Repository {
  private items: ${pascalName}Item[] = [];
  private seq = 0;

  seed(items: ${pascalName}Item[]): void {
    this.items = [...items];
  }

  async list(): Promise<${pascalName}Item[]> {
    return [...this.items];
  }

  async create(input: Create${pascalName}Input): Promise<${pascalName}Item> {
    const item: ${pascalName}Item = {
      id: \`fake-\${++this.seq}\`,
      name: input.name.trim(),
      created_at: new Date().toISOString(),
    };
    this.items.push(item);
    return item;
  }
}

export function createFake${pascalName}Repository(seed: ${pascalName}Item[] = []): Fake${pascalName}Repository {
  const repo = new Fake${pascalName}Repository();
  repo.seed(seed);
  return repo;
}
`
  );

  // lib/<key>/repositories/index.ts
  writeFileIfNotExists(
    path.join(libDir, "repositories", "index.ts"),
    `// Barrel de repositories do módulo ${name}
export * from "./interfaces";
export * from "./example";
`
  );

  // lib/<key>/db/example.ts (caminho oficial da UI — mockável nos testes)
  writeFileIfNotExists(
    path.join(libDir, "db", "example.ts"),
    `export * from "@/lib/${key}/repositories/example";
`
  );

  // lib/<key>/hooks/useExamples.ts
  writeFileIfNotExists(
    path.join(libDir, "hooks", "useExamples.ts"),
    `"use client";

import { useCallback, useEffect, useState } from "react";
import { listExamplesStandalone } from "@/lib/${key}/db/example";
import type { ${pascalName}Item } from "@/lib/${key}/types";

export interface UseExamplesReturn {
  data: ${pascalName}Item[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Fetch+estado no padrão do projeto (promise-chain + flag cancelled).
export function useExamples(): UseExamplesReturn {
  const [data, setData] = useState<${pascalName}Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamples = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listExamplesStandalone());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar itens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listExamplesStandalone().then(
      (items) => {
        if (cancelled) return;
        setData(items);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar itens");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error, refetch: fetchExamples };
}
`
  );

  // lib/<key>/hooks/index.ts
  writeFileIfNotExists(
    path.join(libDir, "hooks", "index.ts"),
    `// React hooks do módulo ${name}
export { useExamples } from "./useExamples";
`
  );

  // lib/<key>/index.ts (NÃO recriar: sem services/, schemas/, use-cases/)
  writeFileIfNotExists(
    path.join(libDir, "index.ts"),
    `// ${name} Module - Public API

// Types (fonte única)
export * from "./types";

// Repositories (Data Access Layer)
export * from "./repositories/example";

// DB barrels (caminho oficial da UI)
export * from "./db/example";

// Hooks (React Data Fetching Layer)
export * from "./hooks/useExamples";

// Utils (regras puras)
export * from "./utils";
`
  );

  // ============================================================
  // 4. Create __tests__/ structure
  // ============================================================
  ensureDir(path.join(ROOT_DIR, "__tests__", "lib", key, "repositories"));
  ensureDir(path.join(ROOT_DIR, "__tests__", "app", key));
  ensureDir(path.join(ROOT_DIR, "__tests__", "components", key));

  // __tests__/lib/<key>/repositories/contract-example.test.ts
  // Suite de contrato compartilhada vs fakes (decisão 57: fakes-only —
  // sem promessa de impl Supabase; ver seam build() se um dia precisar).
  writeFileIfNotExists(
    path.join(ROOT_DIR, "__tests__", "lib", key, "repositories", "contract-example.test.ts"),
    `import { describe, it, expect, beforeEach } from "vitest";
import type { I${pascalName}Repository } from "@/lib/${key}/repositories/interfaces";
import { createFake${pascalName}Repository } from "@/lib/${key}/repositories/fakes/example";

function define${pascalName}RepositoryContract(label: string, build: () => I${pascalName}Repository) {
  describe(\`I${pascalName}Repository contract: \${label}\`, () => {
    let repo: I${pascalName}Repository;

    beforeEach(() => {
      repo = build();
    });

    it("lista vazio no início e cria itens", async () => {
      expect(await repo.list()).toEqual([]);
      const created = await repo.create({ name: "Primeiro" });
      expect(created.id).toBeDefined();
      expect(created.name).toBe("Primeiro");
      expect(await repo.list()).toHaveLength(1);
    });

    it("trim no nome ao criar", async () => {
      const created = await repo.create({ name: "  Espaços  " });
      expect(created.name).toBe("Espaços");
    });
  });
}

define${pascalName}RepositoryContract("fake em memória", () => createFake${pascalName}Repository());
`
  );

  // __tests__/lib/<key>/utils.test.ts
  writeFileIfNotExists(
    path.join(ROOT_DIR, "__tests__", "lib", key, "utils.test.ts"),
    `import { describe, it, expect } from "vitest";
import { exampleUtil } from "@/lib/${key}/utils";

describe("${pascalName} module - utils", () => {
  it("exampleUtil responde", () => {
    expect(exampleUtil()).toContain("${name}");
  });
});
`
  );

  // __tests__/app/<key>/page.test.tsx
  writeFileIfNotExists(
    path.join(ROOT_DIR, "__tests__", "app", key, "page.test.tsx"),
    `import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ${pascalName}Page from "@/app/${key}/page";

describe("${pascalName} module - app", () => {
  it("should render page without crashing", () => {
    render(<${pascalName}Page />);
    expect(screen.getByText(/módulo ${name} criado com sucesso/i)).toBeInTheDocument();
  });
});
`
  );

  // __tests__/components/<key>/Layout.test.tsx
  writeFileIfNotExists(
    path.join(ROOT_DIR, "__tests__", "components", key, `${pascalName}Layout.test.tsx`),
    `import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ${pascalName}Layout } from "@/components/${key}/${pascalName}Layout";

describe("${pascalName}Layout", () => {
  it("should render layout without crashing", () => {
    render(
      <${pascalName}Layout pageTitle="Test" pageSubtitle="Subtitle">
        <div>Children</div>
      </${pascalName}Layout>
    );
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("Subtitle")).toBeInTheDocument();
    expect(screen.getByText("Children")).toBeInTheDocument();
  });
});
`
  );

  // __tests__/components/<key>/<Key>Example.test.tsx
  writeFileIfNotExists(
    path.join(ROOT_DIR, "__tests__", "components", key, `${pascalName}Example.test.tsx`),
    `import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ${pascalName}Example } from "@/components/${key}/${pascalName}Example";

describe("${pascalName}Example", () => {
  it("renderiza o nome", () => {
    render(<${pascalName}Example name="Meu item" />);
    expect(screen.getByText("Meu item")).toBeInTheDocument();
  });
});
`
  );

  // ============================================================
  // 5. Create .agents/modules/<key>/ structure (layout Olympus: backlog +
  // regression por módulo; features vivem em <modulo>/<slug>/ — sem specs/)
  // ============================================================
  const agentsModuleDir = path.join(ROOT_DIR, ".agents", "modules", key);
  ensureDir(agentsModuleDir);

  // .agents/modules/<key>/regression.md (cenários de regressão do módulo)
  writeFileIfNotExists(
    path.join(agentsModuleDir, "regression.md"),
    `# Regression — Módulo ${name}

Cenários promovidos pelos testes de cada feature (Minos) para execução
regressiva antes de cada release do módulo.
`
  );

  // .agents/modules/<key>/backlog.md
  writeFileIfNotExists(
    path.join(agentsModuleDir, "backlog.md"),
    `# Backlog — Módulo ${name}

## Contexto do Módulo

${name} é um módulo do guarda-chuva Héstia. Descreva aqui o domínio e propósito deste módulo.

## Backlog do Módulo

| # | Feature | Descrição | Status | Specs | Planos |
|---|---|---|---|---|---|
| 1 | **Estrutura Inicial** | Estrutura base do módulo ${name} criada via CLI | Concluído | - | - |

---
`
  );

  // ============================================================
  // 6. Update lib/modules.ts
  // ============================================================
  const modulesPath = path.join(ROOT_DIR, "lib", "modules.ts");
  let modulesContent = fs.readFileSync(modulesPath, "utf8");
  
  const newModuleEntry = `  ${quotedKey}: {
    key: '${key}',
    name: '${name}',
    mascot: '${mascotPath}',
    color: '${color}',
  },`;

  // Check if module already exists
  if (modulesContent.includes(`key: '${key}'`)) {
    logWarn(`Module '${key}' already exists in lib/modules.ts, skipping update`);
  } else {
    // Insert before the closing brace of MODULES object
    modulesContent = modulesContent.replace(
      /(\s+)(\}\s+as const;)/,
      `$1${newModuleEntry}\n$1$2`
    );
    writeFile(modulesPath, modulesContent);
  }

  // ============================================================
  // 7. Update .agents/modules/hestia/backlog.md (Módulos Registrados table)
  // ============================================================
  const backlogPath = path.join(ROOT_DIR, ".agents", "modules", "hestia", "backlog.md");
  let backlogContent = fs.readFileSync(backlogPath, "utf8");

  // Check if module already registered
  if (backlogContent.includes(`.agents/modules/${key}/backlog.md`)) {
    logWarn(`Module '${key}' already registered in .agents/modules/hestia/backlog.md, skipping update`);
  } else {
    // Find the table and add a new row
    const tableRow = `| ${getNextModuleNumber(backlogContent)} | **${name}** | [Descreva o domínio do módulo] | \`${key}\` | [.agents/modules/${key}/backlog.md](file:///p:/workspace/IA/hestia/.agents/modules/${key}/backlog.md) |`;

    // Insert after the Pluto row (before the --- separator)
    // Use a more specific pattern matching the Pluto row
    backlogContent = backlogContent.replace(
      /(\| 1 \| \*\*Pluto\*\* \| [\s\S]*? \| \`pluto\` \| \[.+?\]\(.+?\) \|)(\s*\n---)/,
      `$1\n${tableRow}$2`
    );
    writeFile(backlogPath, backlogContent);
  }

// ============================================================
  // 8. Update mascots.ts to register the new mascot
  // ============================================================
  const mascotsPath = path.join(ROOT_DIR, "lib", "hestia", "mascots.ts");
  let mascotsContent = fs.readFileSync(mascotsPath, "utf8");
  
  // Check if mascot already registered in MASCOT_REGISTRY
  if (!mascotsContent.includes(`key: '${key}'`)) {
    // Add to MASCOT_REGISTRY - insert before the FINAL closing brace of the object
    const mascotEntry = `  ${quotedKey}: {\n    key: '${key}',\n    src: '${mascotPath}',\n    alt: '${name}, mascote do módulo ${name}',\n  },`;
    
    // More robust approach: find MASCOT_REGISTRY block and insert before its final closing brace
    const registryStart = mascotsContent.indexOf("export const MASCOT_REGISTRY");
    if (registryStart !== -1) {
      const braceStart = mascotsContent.indexOf("{", registryStart);
      let braceCount = 0;
      let registryEnd = -1;
      for (let i = braceStart; i < mascotsContent.length; i++) {
        if (mascotsContent[i] === "{") braceCount++;
        else if (mascotsContent[i] === "}") {
          braceCount--;
          if (braceCount === 0) {
            registryEnd = i;
            break;
          }
        }
      }
      if (registryEnd !== -1) {
        // Ensure last entry has comma and proper formatting
        let beforeBrace = mascotsContent.slice(0, registryEnd);
        if (!beforeBrace.trimEnd().endsWith(",")) {
          beforeBrace = beforeBrace.replace(/(\n  \})$/, ",\n  }");
        }
        mascotsContent = beforeBrace + "\n" + mascotEntry + "\n" + mascotsContent.slice(registryEnd);
      }
    }
    
    // Add to ROUTE_TO_MASCOT - insert before the FINAL closing brace
    const routeEntry = `  '/${key}': '${key}',`;
    const routeStart = mascotsContent.indexOf("export const ROUTE_TO_MASCOT");
    if (routeStart !== -1) {
      const braceStart = mascotsContent.indexOf("{", routeStart);
      let braceCount = 0;
      let routeEnd = -1;
      for (let i = braceStart; i < mascotsContent.length; i++) {
        if (mascotsContent[i] === "{") braceCount++;
        else if (mascotsContent[i] === "}") {
          braceCount--;
          if (braceCount === 0) {
            routeEnd = i;
            break;
          }
        }
      }
      if (routeEnd !== -1) {
        // Ensure last entry has comma
        let beforeBrace = mascotsContent.slice(0, routeEnd);
        if (!beforeBrace.trimEnd().endsWith(",")) {
          beforeBrace = beforeBrace.replace(/(\n  '[^']+': '[^']+')$/, "$1,");
        }
        mascotsContent = beforeBrace + "\n" + routeEntry + "\n" + mascotsContent.slice(routeEnd);
      }
    }
    
    writeFile(mascotsPath, mascotsContent);
  } else {
    logWarn(`Mascot '${key}' already registered in lib/hestia/mascots.ts, skipping update`);
  }

  logInfo(`\n✅ Module '${name}' (key: ${key}) created successfully!`);
  logInfo(`\nNext steps:`);
  logInfo(`  1. Add mascot image to public${mascotPath}`);
  logInfo(`  2. Define your types in lib/${key}/types.ts (fonte única)`);
  logInfo(`  3. Implement repositories + fakes + contracts (ver Mapa de Camadas no AGENTS.md)`);
  logInfo(`  4. UI consome via lib/${key}/db/* + hooks/* (sem services/, schemas/, use-cases/)`);
  logInfo(`  5. Add navigation items in components/${key}/${pascalName}Layout.tsx`);
  logInfo(`  6. Run 'npm run dev' to verify the module loads correctly`);
}

function getNextModuleNumber(backlogContent) {
  // Conta apenas a tabela "Módulos Registrados" (a tabela estrutural
  // abaixo usa sequência própria e não deve contaminar a numeração).
  const start = backlogContent.indexOf("## Módulos Registrados");
  const end = backlogContent.indexOf("## Backlog", start === -1 ? 0 : start);
  const section = backlogContent.slice(
    start === -1 ? 0 : start,
    end === -1 ? undefined : end
  );
  const lines = section.split("\n");
  let maxNum = 0;
  for (const line of lines) {
    const match = line.match(/^\|\s*(\d+)\s*\|/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return maxNum + 1;
}

main();