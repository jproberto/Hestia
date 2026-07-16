#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * SDD Workflow CLI Copilot
 * Automatiza e garante a conformidade com as regras do fluxo SDD do projeto Hestia.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "../..");
const PLANS_DIR = path.join(ROOT_DIR, ".agents/plans");
const LOGS_DIR = path.join(ROOT_DIR, ".agents/logs");
const SPECS_DIR = path.join(ROOT_DIR, ".agents/specs");

// Helper para obter timestamp formatado
function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// Helper para logar no terminal
function logInfo(msg) {
  console.log(`\x1b[32m[INFO]\x1b[0m ${msg}`);
}

function logWarn(msg) {
  console.warn(`\x1b[33m[WARN]\x1b[0m ${msg}`);
}

function logError(msg) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
}

// Execução segura de comandos do terminal
function runCmd(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    throw new Error(error.stdout || error.message);
  }
}

// Encontra o arquivo do plano com base no slug
function findPlanFile(slug) {
  const exactPath = path.join(PLANS_DIR, `${slug}-plan.md`);
  if (fs.existsSync(exactPath)) return exactPath;

  // Busca parcial se não for data exata
  const files = fs.readdirSync(PLANS_DIR);
  const matched = files.find((f) => f.includes(slug) && f.endsWith("-plan.md"));
  if (matched) return path.join(PLANS_DIR, matched);

  return null;
}

// Comando: start
function cmdStart(slug) {
  if (!slug) {
    logError("Forneça o slug do plano. Ex: node sdd.js start 2024-07-15-pagina-login");
    process.exit(1);
  }

  logInfo(`Verificando conformidade da transição (sdd-tool-guardian)...`);
  const planPath = findPlanFile(slug);
  if (!planPath) {
    logError(`Plano de implementação para o slug '${slug}' não foi encontrado em .agents/plans/`);
    process.exit(1);
  }

  // Verifica se existe especificação correspondente (regra de fluxo)
  const specName = path.basename(planPath).replace("-plan.md", "-design.md");
  const specPath = path.join(SPECS_DIR, specName);
  if (!fs.existsSync(specPath)) {
    logWarn(`Transição Irregular: Spec '${specName}' não encontrada em .agents/specs/. O fluxo SDD exige spec antes de plano.`);
  } else {
    logInfo(`Guardian: Transição válida! Spec correspondente encontrada.`);
  }

  const logFileName = path.basename(planPath).replace("-plan.md", "-execution.log");
  const logPath = path.join(LOGS_DIR, logFileName);

  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  if (fs.existsSync(logPath)) {
    logWarn(`Log de execução já existe para '${slug}'.`);
    process.exit(0);
  }

  logInfo(`Inicializando log de execução estruturado (sdd-tool-tracking)...`);
  const planContent = fs.readFileSync(planPath, "utf8");
  const tasks = [];
  const lines = planContent.split("\n");
  let tempTaskId = 1;

  for (const line of lines) {
    if (line.startsWith("### Tarefa ")) {
      const taskName = line.replace("### Tarefa ", "").trim();
      const match = taskName.match(/^(\d+):\s*(.*)$/);
      if (match) {
        tasks.push({ id: match[1], name: match[2], status: "Pendente" });
      } else {
        tasks.push({ id: String(tempTaskId++), name: taskName, status: "Pendente" });
      }
    }
  }

  if (tasks.length === 0) {
    logError("Nenhuma tarefa encontrada no plano. Certifique-se de usar cabeçalhos '### Tarefa N: ...'");
    process.exit(1);
  }

  let logContent = `# Registro de Execução - ${slug}\n\n`;
  logContent += `<!-- TABLE_START -->\n`;
  logContent += `| ID | Tarefa | Status |\n`;
  logContent += `|---|---|---|\n`;
  for (const task of tasks) {
    logContent += `| ${task.id} | ${task.name} | ${task.status} |\n`;
  }
  logContent += `<!-- TABLE_END -->\n\n`;
  logContent += `## Histórico de Eventos\n`;
  logContent += `<!-- EVENTS -->\n`;
  logContent += `[${getTimestamp()}] - INFO: Início da execução do plano '${slug}'\n`;

  fs.writeFileSync(logPath, logContent, "utf8");
  logInfo(`Log estruturado criado em: .agents/logs/${logFileName}`);
}

// Carrega o log existente e retorna parsed
function loadActiveLog() {
  if (!fs.existsSync(LOGS_DIR)) {
    logError("Diretório de logs .agents/logs/ não existe. Rode 'start' primeiro.");
    process.exit(1);
  }

  const files = fs.readdirSync(LOGS_DIR)
    .filter((f) => f.endsWith("-execution.log"))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(LOGS_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length === 0) {
    logError("Nenhum log de execução ativo encontrado. Rode 'start' primeiro.");
    process.exit(1);
  }

  const activeLog = files[0].name;
  const logPath = path.join(LOGS_DIR, activeLog);
  const content = fs.readFileSync(logPath, "utf8");
  return { logPath, content };
}

// Atualiza o arquivo de log com nova tabela e evento
function updateLog(logPath, content, taskId, newStatus, eventMsg, eventLevel = "INFO") {
  const tableStartIdx = content.indexOf("<!-- TABLE_START -->");
  const tableEndIdx = content.indexOf("<!-- TABLE_END -->");

  if (tableStartIdx === -1 || tableEndIdx === -1) {
    logError("Estrutura do arquivo de log corrompida. Não foi possível localizar a tabela de status.");
    process.exit(1);
  }

  const beforeTable = content.substring(0, tableStartIdx + "<!-- TABLE_START -->".length);
  const afterTable = content.substring(tableEndIdx);
  const tableContent = content.substring(tableStartIdx + "<!-- TABLE_START -->".length, tableEndIdx);

  const lines = tableContent.split("\n");
  let updatedTable = "\n";
  let found = false;

  for (const line of lines) {
    if (!line.trim() || line.startsWith("| ID |") || line.startsWith("|---|")) {
      if (line.trim()) updatedTable += line + "\n";
      continue;
    }
    const parts = line.split("|");
    if (parts.length >= 4) {
      const currentId = parts[1].trim();
      const currentTask = parts[2].trim();
      if (currentId === String(taskId)) {
        updatedTable += `| ${currentId} | ${currentTask} | ${newStatus} |\n`;
        found = true;
      } else {
        updatedTable += line + "\n";
      }
    }
  }

  if (!found) {
    logError(`Tarefa com ID '${taskId}' não foi encontrada no log de execução.`);
    process.exit(1);
  }

  const timestamp = getTimestamp();
  let updatedContent = beforeTable + updatedTable + afterTable;
  updatedContent += `[${timestamp}] - ${eventLevel}: ${eventMsg}\n`;

  fs.writeFileSync(logPath, updatedContent, "utf8");
}

// Comando: task-start
function cmdTaskStart(taskId) {
  if (!taskId) {
    logError("Forneça o ID da tarefa. Ex: node sdd.js task-start 1");
    process.exit(1);
  }
  const { logPath, content } = loadActiveLog();
  updateLog(logPath, content, taskId, "Em Andamento", `Tarefa ${taskId} iniciada.`);
  logInfo(`Tarefa ${taskId} marcada como Em Andamento.`);
}

// Comando: task-complete
function cmdTaskComplete(taskId) {
  if (!taskId) {
    logError("Forneça o ID da tarefa. Ex: node sdd.js task-complete 1");
    process.exit(1);
  }

  logInfo("Executando checagens de validação da tarefa (Linter e TypeScript)...");
  try {
    logInfo("Executando: npx eslint .");
    runCmd("npx eslint .");
    logInfo("Linter OK.");
  } catch (error) {
    logError("Linter falhou. Corrija os erros antes de concluir a tarefa.");
    console.error(error.message);
    process.exit(1);
  }

  try {
    logInfo("Executando: npx tsc --noEmit");
    runCmd("npx tsc --noEmit");
    logInfo("TypeScript OK.");
  } catch (error) {
    logError("TypeScript compilation falhou. Corrija os erros antes de concluir a tarefa.");
    console.error(error.message);
    process.exit(1);
  }

  const { logPath, content } = loadActiveLog();
  updateLog(logPath, content, taskId, "Concluída", `Tarefa ${taskId} concluída com sucesso.`);
  logInfo(`Tarefa ${taskId} marcada como Concluída.`);
}

// Comando: task-block
function cmdTaskBlock(taskId, reason) {
  if (!taskId || !reason) {
    logError("Forneça o ID e o motivo do bloqueio. Ex: node sdd.js task-block 1 \"Falta biblioteca X\"");
    process.exit(1);
  }
  const { logPath, content } = loadActiveLog();
  updateLog(logPath, content, taskId, "Bloqueada", `Tarefa ${taskId} BLOQUEADA: ${reason}`, "WARN");
  logWarn(`Tarefa ${taskId} marcada como Bloqueada.`);
}

// Comando: request-review
function cmdRequestReview() {
  const { logPath, content } = loadActiveLog();
  const tableStartIdx = content.indexOf("<!-- TABLE_START -->");
  const tableEndIdx = content.indexOf("<!-- TABLE_END -->");

  const tableContent = content.substring(tableStartIdx + "<!-- TABLE_START -->".length, tableEndIdx);
  const lines = tableContent.split("\n");
  const pendingTasks = [];

  for (const line of lines) {
    const parts = line.split("|");
    if (parts.length >= 4) {
      const currentId = parts[1].trim();
      const currentTask = parts[2].trim();
      const currentStatus = parts[3].trim();
      if (currentId !== "ID" && currentStatus !== "Concluída" && !currentTask.includes("---")) {
        pendingTasks.push({ id: currentId, name: currentTask, status: currentStatus });
      }
    }
  }

  if (pendingTasks.length > 0) {
    logError("Não é possível solicitar a revisão. Existem tarefas pendentes ou bloqueadas:");
    for (const t of pendingTasks) {
      console.log(` - ID ${t.id}: ${t.name} (Status: ${t.status})`);
    }
    process.exit(1);
  }

  logInfo("Todas as tarefas concluídas! Prontos para transicionar para sdd-04-review.");
  console.log(`\n\x1b[32m=== TEMPLATE DE REVISÃO RECOMENDADO ===\x1b[0m`);
  console.log(`Execute a skill sdd-04-review respondendo com o template:`);
  console.log(`
## Achados

## Lacunas de Teste
- [Sem testes de unidade configurados no projeto - Validação Manual Realizada]

## Perguntas

## Avaliação
Spec: aprovado
Qualidade: aprovado
Pronto para prosseguir: sim
`);
}

// Comando: commit
function cmdCommit(msg) {
  if (!msg) {
    logError("Forneça a mensagem de commit. Ex: node sdd.js commit \"feat: adiciona componente X\"");
    process.exit(1);
  }

  logInfo("Executando checagem de segurança de arquivos staged (sdd-tool-commit)...");
  let statusOutput = "";
  try {
    statusOutput = runCmd("git status --porcelain");
  } catch (error) {
    logError("Falha ao executar 'git status --porcelain'. Certifique-se de que está em um repositório Git.");
    process.exit(1);
  }

  const lines = statusOutput.split("\n");
  const stagedEnvFiles = [];
  const stagedOtherFiles = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const isStaged = line.startsWith("A ") || line.startsWith("M ") || line.startsWith("R ");
    const filePath = line.substring(3).trim();

    if (isStaged) {
      stagedOtherFiles.push(filePath);
      // Detecção de arquivos .env (qualquer arquivo contendo .env exceto o template .env.local.example)
      if (filePath.includes(".env") && !filePath.endsWith(".env.local.example")) {
        stagedEnvFiles.push(filePath);
      }
    }
  }

  if (stagedEnvFiles.length > 0) {
    logError("VULNERABILIDADE DE SEGURANÇA DETECTADA!");
    logError("Você está tentando commitar os seguintes arquivos locais de variáveis de ambiente:");
    for (const f of stagedEnvFiles) {
      console.error(`  -> ${f}`);
    }
    logError("O commit foi abortado de forma preventiva. Remova esses arquivos do stage (git restore --staged <file>) antes de prosseguir.");
    process.exit(1);
  }

  if (stagedOtherFiles.length === 0) {
    logWarn("Nenhum arquivo staged para commit. Adicione os arquivos necessários (git add <arquivos>).");
    process.exit(1);
  }

  logInfo("Analisando o histórico de commits recente para validar idioma...");
  let logHistory = "";
  try {
    logHistory = runCmd("git log --oneline -20");
  } catch (error) {
    logWarn("Não foi possível ler o histórico de commits. Ignorando validação de idioma.");
  }

  if (logHistory) {
    const portugueseKeywords = ["adiciona", "cria", "corrige", "ajusta", "atualiza", "remove", "de", "para", "o", "com"];
    const englishKeywords = ["add", "fix", "create", "update", "remove", "to", "for", "the", "with"];

    let ptScore = 0;
    let enScore = 0;

    const historyWords = logHistory.toLowerCase().split(/\s+/);
    for (const word of historyWords) {
      if (portugueseKeywords.includes(word)) ptScore++;
      if (englishKeywords.includes(word)) enScore++;
    }

    const isHistoryPt = ptScore > enScore;
    const msgWords = msg.toLowerCase().split(/\s+/);
    let msgEnCount = 0;
    let msgPtCount = 0;

    for (const word of msgWords) {
      if (englishKeywords.includes(word)) msgEnCount++;
      if (portugueseKeywords.includes(word)) msgPtCount++;
    }

    if (isHistoryPt && msgEnCount > msgPtCount && msgPtCount === 0) {
      logError("CONVENÇÃO DE IDIOMA VIOLADA!");
      logError(`O histórico do projeto sugere commits em PORTUGUÊS (Pt Score: ${ptScore}, En Score: ${enScore}).`);
      logError(`Sua mensagem de commit está em inglês: "${msg}"`);
      logError("Altere a mensagem de commit para português antes de submeter.");
      process.exit(1);
    }
  }

  logInfo("Segurança e Idioma validados com sucesso!");
  try {
    logInfo("Executando: git commit...");
    const commitRes = runCmd(`git commit -m "${msg}"`);
    console.log(commitRes);
    logInfo("Commit criado localmente com sucesso. NÃO foi feito push automático.");
  } catch (error) {
    logError("Falha ao criar o commit.");
    console.error(error.message);
    process.exit(1);
  }
}

// Dispatcher de comandos
const [,, command, ...args] = process.argv;

switch (command) {
  case "start":
    cmdStart(args[0]);
    break;
  case "task-start":
    cmdTaskStart(args[0]);
    break;
  case "task-complete":
    cmdTaskComplete(args[0]);
    break;
  case "task-block":
    cmdTaskBlock(args[0], args[1]);
    break;
  case "request-review":
    cmdRequestReview();
    break;
  case "commit":
    cmdCommit(args[0]);
    break;
  default:
    console.log(`
Uso do SDD CLI Copilot:
  node sdd.js start <slug>                 Inicializa o log de tracking e roda o guardian.
  node sdd.js task-start <task-id>         Marca uma tarefa como em andamento.
  node sdd.js task-complete <task-id>      Valida linter/build e marca tarefa como concluída.
  node sdd.js task-block <task-id> <motivo> Marca uma tarefa como bloqueada com o motivo.
  node sdd.js request-review               Valida tarefas e gera template de review.
  node sdd.js commit "<mensagem>"          Garante a segurança de .env, valida o idioma e commita.
`);
    break;
}
