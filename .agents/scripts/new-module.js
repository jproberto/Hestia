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

  // ============================================================
  // 3. Create lib/<key>/ structure
  // ============================================================
  const libDir = path.join(ROOT_DIR, "lib", key);
  ensureDir(libDir);
  ensureDir(path.join(libDir, "repositories"));
  ensureDir(path.join(libDir, "services"));
  ensureDir(path.join(libDir, "schemas"));
  ensureDir(path.join(libDir, "hooks"));
  ensureDir(path.join(libDir, "db"));

  // lib/<key>/types.ts
  writeFileIfNotExists(
    path.join(libDir, "types.ts"),
    `// Types consolidados do módulo ${name}
// Exportados publicamente via lib/${key}/index.ts

// TODO: Defina os tipos do seu módulo aqui
export interface ${pascalName}ExampleType {
  id: string;
  name: string;
  createdAt: string;
}
`
  );

  // lib/<key>/utils.ts
  writeFileIfNotExists(
    path.join(libDir, "utils.ts"),
    `// Utilities para o módulo ${name}

export function exampleUtil(): string {
  return "${name} utility function";
}
`
  );

  // lib/<key>/index.ts
  writeFileIfNotExists(
    path.join(libDir, "index.ts"),
    `// ${name} Module - Public API
// Este é o único ponto de entrada externo para o módulo ${name}

// Types
export * from "./types";

// Repositories (Data Access Layer)
// export * from "./repositories/example";

// Services (Business Logic Layer)
// export * from "./services/example";

// Hooks (React Data Fetching Layer)
// export * from "./hooks/useExample";

// Utils
export * from "./utils";

// DB utilities
// export * from "./db/example";
`
  );

  // lib/<key>/repositories/index.ts
  writeFileIfNotExists(
    path.join(libDir, "repositories", "index.ts"),
    `// Repository interfaces and implementations for ${name} module
// Export repository interfaces here
`
  );

  // lib/<key>/services/index.ts
  writeFileIfNotExists(
    path.join(libDir, "services", "index.ts"),
    `// Services for ${name} module
// Export services here
`
  );

  // lib/<key>/hooks/index.ts
  writeFileIfNotExists(
    path.join(libDir, "hooks", "index.ts"),
    `// React hooks for ${name} module
// Export hooks here
`
  );

  // lib/<key>/db/index.ts
  writeFileIfNotExists(
    path.join(libDir, "db", "index.ts"),
    `// Database utilities for ${name} module
// Export DB functions here
`
  );

  // lib/<key>/schemas/index.ts (for Zod schemas)
  writeFileIfNotExists(
    path.join(libDir, "schemas", "index.ts"),
    `// Zod schemas for ${name} module
// Export schemas here
`
  );

  // ============================================================
  // 4. Create __tests__/ structure
  // ============================================================
  ensureDir(path.join(ROOT_DIR, "__tests__", "lib", key));
  ensureDir(path.join(ROOT_DIR, "__tests__", "app", key));
  ensureDir(path.join(ROOT_DIR, "__tests__", "components", key));

  // __tests__/lib/<key>/example.test.ts
  writeFileIfNotExists(
    path.join(ROOT_DIR, "__tests__", "lib", key, "example.test.ts"),
    `import { describe, it, expect } from "vitest";

describe("${pascalName} module - lib", () => {
  it("should have placeholder test", () => {
    expect(true).toBe(true);
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

  // ============================================================
  // 5. Create .agents/<key>/ structure
  // ============================================================
  const agentsModuleDir = path.join(ROOT_DIR, ".agents", key);
  ensureDir(agentsModuleDir);
  ensureDir(path.join(agentsModuleDir, "specs"));
  ensureDir(path.join(agentsModuleDir, "plans"));
  ensureDir(path.join(agentsModuleDir, "logs"));

  // .agents/<key>/backlog.md
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
  // 7. Update .agents/backlog.md (Módulos Registrados table)
  // ============================================================
  const backlogPath = path.join(ROOT_DIR, ".agents", "backlog.md");
  let backlogContent = fs.readFileSync(backlogPath, "utf8");
  
  // Check if module already registered
  if (backlogContent.includes(`.agents/${key}/backlog.md`)) {
    logWarn(`Module '${key}' already registered in .agents/backlog.md, skipping update`);
  } else {
    // Find the table and add a new row
    const tableRow = `| ${getNextModuleNumber(backlogContent)} | **${name}** | [Descreva o domínio do módulo] | \`${key}\` | [.agents/${key}/backlog.md](file:///p:/workspace/IA/hestia/.agents/${key}/backlog.md) |`;
    
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
  logInfo(`  2. Define your types in lib/${key}/types.ts`);
  logInfo(`  3. Implement repositories, services, and hooks`);
  logInfo(`  4. Add navigation items in components/${key}/${pascalName}Layout.tsx`);
  logInfo(`  5. Run 'npm run dev' to verify the module loads correctly`);
}

function getNextModuleNumber(backlogContent) {
  const lines = backlogContent.split("\n");
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