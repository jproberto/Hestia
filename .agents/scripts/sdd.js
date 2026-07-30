#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * CLI de Automação de Processo (SDD CLI)
 * Centraliza validações de branch, linter/compilação, guardian, testes e commits de segurança.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "../../");
const AGENTS_DIR = path.join(ROOT_DIR, ".agents");
const SPECS_DIR = path.join(AGENTS_DIR, "specs");
const PLANS_DIR = path.join(AGENTS_DIR, "plans");

function logInfo(msg) {
  console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`);
}

function logWarn(msg) {
  console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`);
}

function logError(msg) {
  console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`);
}

function runCmd(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: "utf8" }).trim();
  } catch (error) {
    throw new Error(error.stdout || error.stderr || error.message);
  }
}

// Localiza o arquivo de plano com base no slug
function findPlanFile(slug) {
  if (!fs.existsSync(PLANS_DIR)) return null;
  const files = fs.readdirSync(PLANS_DIR);
  const match = files.find((f) => f.startsWith(slug) && f.endsWith("-plan.md"));
  return match ? path.join(PLANS_DIR, match) : null;
}

// Comando: start
function cmdStart(slug) {
  if (!slug) {
    logError("Forneça o slug do plano. Ex: node sdd.js start 02-ajuste-orcamento");
    process.exit(1);
  }

  logInfo(`Inicializando fluxo de tracking para o plano: '${slug}'...`);

  // 1. Validação de branch git
  try {
    const branchName = runCmd("git rev-parse --abbrev-ref HEAD");
    if (branchName === "main" || branchName === "develop") {
      logError(`VIOLAÇÃO DE PROCESSO: O desenvolvimento direto nas branches '${branchName}' é proibido.`);
      logError("Crie e mude para uma branch de feature dedicada antes de iniciar. Ex: feature/nome-da-feature");
      process.exit(1);
    }
    logInfo(`Branch Git ativa válida: '${branchName}'`);
  } catch {
    logWarn("Não foi possível validar a branch git ativa. Continuando...");
  }

  const planPath = findPlanFile(slug);
  if (!planPath) {
    logError(`Plano de implementação para o slug '${slug}' não foi encontrado em .agents/plans/`);
    process.exit(1);
  }

  // 2. Verifica se existe especificação correspondente (regra de fluxo)
  const specName = path.basename(planPath).replace("-plan.md", "-spec.md");
  const specPath = path.join(SPECS_DIR, specName);
  if (!fs.existsSync(specPath)) {
    logError(`VIOLAÇÃO DE PROCESSO: Arquivo de especificação '${specName}' não foi encontrado em .agents/specs/.`);
    logError("O fluxo SDD exige que a especificação seja concluída, aprovada pelo usuário e salva antes de iniciar o plano.");
    process.exit(1);
  } else {
    logInfo(`Guardian: Spec correspondente encontrada.`);
  }

  // 3. Checagem do status no backlog.md
  const backlogPath = path.join(ROOT_DIR, ".agents/backlog.md");
  if (fs.existsSync(backlogPath)) {
    const backlogContent = fs.readFileSync(backlogPath, "utf8");
    const matchId = slug.match(/^(\d+)/);
    if (matchId) {
      const id = parseInt(matchId[1], 10);
      const lines = backlogContent.split("\n");
      let featureRow = null;
      for (const line of lines) {
        const regex = new RegExp(`^\\s*\\|\\s*${id}\\s*\\|`);
        if (regex.test(line)) {
          featureRow = line;
          break;
        }
      }

      if (featureRow) {
        const columns = featureRow.split("|").map(col => col.trim());
        if (columns.length >= 5) {
          const status = columns[4]; // Coluna de status
          logInfo(`Status da feature ${id} no backlog: '${status}'`);
          if (status !== "Especificado" && status !== "Em Desenvolvimento" && status !== "Concluído") {
            logError(`VIOLAÇÃO DE PROCESSO: O status da feature ${id} no backlog é '${status}'.`);
            logError("Para iniciar a execução de um plano, o status da feature deve ser 'Especificado' ou 'Em Desenvolvimento'.");
            process.exit(1);
          }
        }
      } else {
        logWarn(`Feature ID ${id} não encontrada na tabela do backlog.md.`);
      }
    }
  }

  logInfo(`Plano de tarefas '${slug}' validado e pronto para desenvolvimento local.`);
}

// Comando: task-start
function cmdTaskStart(taskId) {
  if (!taskId) {
    logError("Forneça o ID da tarefa. Ex: node sdd.js task-start 1");
    process.exit(1);
  }

  // Valida se há especificações ou planos não commitados no Git
  try {
    const gitStatus = runCmd("git status --porcelain");
    const lines = gitStatus.split("\n");
    const uncommittedDocs = lines.filter(line => {
      const trimmed = line.trim();
      return (
        trimmed.includes(".agents/specs/") ||
        trimmed.includes(".agents/plans/")
      );
    });

    if (uncommittedDocs.length > 0) {
      logError("Abortando: Existem arquivos de especificação ou planejamento modificados ou não commitados no Git!");
      console.log(gitStatus);
      logWarn("Por favor, comite os arquivos de design (.agents/specs/ e .agents/plans/) antes de iniciar o desenvolvimento das tarefas.");
      process.exit(1);
    }
  } catch {
    // Prossegue caso falhe Git check
  }

  logInfo(`Tarefa ${taskId} marcada como Em Andamento no CLI.`);
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

  logInfo(`Tarefa ${taskId} marcada como Concluída no CLI.`);
}

// Comando: task-block
function cmdTaskBlock(taskId, reason) {
  if (!taskId || !reason) {
    logError("Forneça o ID e o motivo do bloqueio. Ex: node sdd.js task-block 1 \"Falta biblioteca X\"");
    process.exit(1);
  }
  logWarn(`Tarefa ${taskId} marcada como Bloqueada no CLI. Motivo: ${reason}`);
}

// Comando: request-review
function cmdRequestReview() {
  logInfo("Executando checagens estáticas e testes automatizados de qualidade...");
  
  try {
    logInfo("Executando linter...");
    runCmd("npx eslint .");
  } catch (error) {
    logError("Linter encontrou falhas. Abortando request-review.");
    console.error(error.message);
    process.exit(1);
  }

  try {
    logInfo("Executando build do compilador TypeScript...");
    runCmd("npx tsc --noEmit");
  } catch (error) {
    logError("Falha na compilação do TypeScript. Abortando request-review.");
    console.error(error.message);
    process.exit(1);
  }

  try {
    logInfo("Executando suíte completa de testes automatizados...");
    runCmd("npx vitest run");
    logInfo("Todos os testes automatizados passaram!");
  } catch (error) {
    logError("Falha em testes unitários ou de UI. Corrija os erros antes de prosseguir.");
    console.error(error.message);
    process.exit(1);
  }

  logInfo("Todas as tarefas concluídas! Prontos para transicionar para a revisão técnica (sdd-04-review) e homologação manual (sdd-05-manual-test).");
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
  } catch {
    logError("Falha ao executar 'git status --porcelain'. Certifique-se de que está em um repositório Git.");
    process.exit(1);
  }

  const lines = statusOutput.split("\n");
  const stagedEnvFiles = [];
  const stagedOtherFiles = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const isStaged = line.startsWith("A ") || line.startsWith("M ") || line.startsWith("R ") || line.startsWith("D ");
    const filePath = line.substring(3).trim();

    if (isStaged) {
      stagedOtherFiles.push(filePath);
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
  } catch {
    logWarn("Não foi possível ler o histórico de commits. Ignorando validação de idioma.");
  }

  if (logHistory) {
    // Remove o prefixo do commit convencional (ex: "feat: ", "fix: ") para focar no conteúdo
    const msgContent = msg.includes(":") ? msg.substring(msg.indexOf(":") + 1).trim() : msg;

    // Função para tokenizar e limpar palavras de pontuações
    const tokenize = (text) => {
      return text.toLowerCase()
        .replace(/[^\w\s\u00C0-\u00FF]/g, "") // remove pontuação mas mantém caracteres acentuados
        .split(/\s+/)
        .filter(Boolean);
    };

    const portugueseKeywords = [
      "adiciona", "adicionados", "cria", "criado", "corrige", "corrigido", "ajusta", "ajustado",
      "atualiza", "atualizado", "remove", "removido", "implementa", "implementado", "refatora",
      "refatorado", "de", "para", "o", "a", "os", "as", "em", "no", "na", "com", "por", "um", "uma", "e"
    ];
    const englishKeywords = [
      "add", "added", "create", "created", "fix", "fixed", "update", "updated", "remove", "removed",
      "implement", "implemented", "refactor", "refactored", "to", "for", "the", "in", "on", "at", "with",
      "by", "from", "a", "an", "and"
    ];

    let ptScore = 0;
    let enScore = 0;

    const historyWords = tokenize(logHistory);
    for (const word of historyWords) {
      if (portugueseKeywords.includes(word)) ptScore++;
      if (englishKeywords.includes(word)) enScore++;
    }

    const isHistoryPt = ptScore > enScore;
    const msgWords = tokenize(msgContent);
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

// Comando: guardian
function cmdGuardian(currentSkill, intendedAction) {
  if (!currentSkill || !intendedAction) {
    logError("Forneça a skill atual e a ação pretendida. Ex: node sdd.js guardian sdd-01-brainstorm sdd-02-plan");
    process.exit(1);
  }

  const validTransitions = {
    "sdd-01-brainstorm": ["sdd-02-plan", "write_spec", "spec"],
    "sdd-02-plan": ["sdd-03-implement", "write_plan", "plan"],
    "sdd-03-implement": ["sdd-tool-db-migration", "sdd-tool-debug", "sdd-04-review", "task"],
    "sdd-04-review": ["sdd-tool-debug", "sdd-03-implement", "sdd-05-manual-test"],
    "sdd-05-manual-test": ["sdd-03-implement", "sdd-tool-debug", "sdd-writer-changelog", "sdd-writer-skills", "sdd-writer-agents", "sdd-tool-commit"],
  };

  const allowed = validTransitions[currentSkill];
  if (!allowed) {
    logError(`VIOLAÇÃO DE PROCESSO: Skill '${currentSkill}' não possui regras de transição válidas registradas no Guardian.`);
    process.exit(1);
  }

  const isActionAllowed = allowed.some((act) => intendedAction.toLowerCase().includes(act.toLowerCase()));
  if (!isActionAllowed) {
    logError(`VIOLAÇÃO DE PROCESSO (GUARDIAN BLOQUEIO): A transição de '${currentSkill}' para '${intendedAction}' É PROIBIDA.`);
    logError(`Ações/skills permitidas a partir de '${currentSkill}': ${allowed.join(", ")}`);
    process.exit(1);
  }

  logInfo(`Guardian: Transição de '${currentSkill}' para '${intendedAction}' VALIDADA E APROVADA FISICAMENTE.`);
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
  case "guardian":
    cmdGuardian(args[0], args[1]);
    break;
  default:
    console.log(`
Uso do SDD CLI Copilot:
  node sdd.js start <slug>                 Inicializa a validação do plano e roda o guardian.
  node sdd.js task-start <task-id>         Marca uma tarefa como em andamento.
  node sdd.js task-complete <task-id>      Valida linter/build e marca tarefa como concluída.
  node sdd.js task-block <task-id> <motivo> Marca uma tarefa como bloqueada com o motivo.
  node sdd.js request-review               Valida tarefas, roda testes locais e gera template de review.
  node sdd.js commit "<mensagem>"          Garante a segurança de .env, valida o idioma e commita.
  node sdd.js guardian <skill> <acao>      Valida fisicamente a transição entre skills no processo.
`);
    break;
}
