import type { Program, ProgramStatus } from "./types";

export const TEMPLATES_SUGESTAO: readonly string[] = [
  "Treino {adj} de {substantivo} {complemento}",
  "{substantivo} {adj} {complemento}",
  "Ficha {adj} {complemento}",
  "Projeto {substantivo} {adj} {complemento}",
  "Treino de {substantivo} {complemento}",
  "Modo {adj} {complemento}",
];

export const POOLS_SUGESTAO: {
  readonly adjetivos: readonly string[];
  readonly substantivos: readonly string[];
  readonly complementos: readonly string[];
} = {
  adjetivos: [
    "Monstro",
    "Brutal",
    "Insano",
    "Cavalar",
    "Sinistro",
    "Gigante",
    "Nervoso",
    "Maromba",
  ],
  substantivos: [
    "Peito",
    "Costas",
    "Pernas",
    "Ombros",
    "Bíceps",
    "Tríceps",
    "Glúteos",
    "Abdômen",
  ],
  complementos: [
    "sem Mimimi",
    "do Pump",
    "para Ficar Gigante",
    "até Falhar",
    "no Talento",
    "com Foco Total",
    "modo Caverna",
    "sem Desculpa",
  ],
};

export function normalizarTitulo(titulo: string): string {
  return titulo.trim().replace(/\s+/g, " ");
}

export function validarTitulo(titulo: string): string | null {
  if (normalizarTitulo(titulo) === "") {
    return "Título não pode estar vazio";
  }
  return null;
}

function escolherAleatorio(pool: readonly string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function sortearSugestao(): string {
  const template = escolherAleatorio(TEMPLATES_SUGESTAO);
  return template
    .replace(/\{adj\}/g, () => escolherAleatorio(POOLS_SUGESTAO.adjetivos))
    .replace(/\{substantivo\}/g, () =>
      escolherAleatorio(POOLS_SUGESTAO.substantivos),
    )
    .replace(/\{complemento\}/g, () =>
      escolherAleatorio(POOLS_SUGESTAO.complementos),
    );
}

export type AcaoPrograma = "ativar" | "inativar" | "reativar";

export function transicoesPermitidas(status: ProgramStatus): AcaoPrograma[] {
  if (status === "rascunho") return ["ativar"];
  if (status === "ativo") return ["inativar"];
  return ["reativar"];
}

export function guardaAtivacao(hasWorkoutWithExercise: boolean): string | null {
  if (!hasWorkoutWithExercise) {
    return "Adicione pelo menos um treino com exercícios para ativar";
  }
  return null;
}

export function aplicarEfeitoColateralAtivacao(
  programas: Program[],
  dono: string,
): Program[] {
  return programas.map((programa) =>
    programa.owner === dono && programa.status === "ativo"
      ? { ...programa, status: "inativo" as const }
      : programa,
  );
}
