import type { Program, ProgramStatus } from "./types";

export const TEMPLATES_SUGESTAO: readonly string[] = [
  "Treino {adj} de {substantivo} {complemento}",
  "{substantivo} {adj} {complemento}",
  "Projeto {substantivo} {adj} {complemento}",
  "Missão {substantivo} {adj} {complemento}",
  "Operação {adj} de {substantivo} {complemento}",
  "Rotina {adj} de {substantivo} {complemento}",
  "Ficha {adj} {complemento}",
  "Treino de {substantivo} {complemento}",
  "Modo {adj} {complemento}",
  "Protocolo {adj} {complemento}",
];

export const POOLS_SUGESTAO: {
  readonly adjetivos: readonly string[];
  readonly substantivos: readonly string[];
  readonly complementos: readonly string[];
} = {
  adjetivos: [
    "Monstro",
    "Brutal",
    "Cavalar",
    "Gigante",
    "Maromba",
    "Alucinante",
    "Veloz",
    "Bestial",
    "Letal",
    "Descomunal",
    "Implacável",
    "Nuclear",
    "Colossal",
    "Fenomenal",
    "Monumental",
    "Animal",
    "Espetacular",
    "Incrível",
    "Inquebrável",
    "Indestrutível",
    "Imparável",
    "Insuperável",
    "Imbatível",
    "Invencível",
    "Forte",
    "Enorme",
    "Grande",
    "Persistente",
    "Cortante",
    "Vibrante",
    "Voraz",
    "Feroz",
  ],
  substantivos: [
    "Hipertrofia",
    "Força",
    "Potência",
    "Resistência",
    "Massa",
    "Definição",
    "Performance",
    "Explosão",
    "Evolução",
    "Transformação",
    "Volume",
    "Intensidade",
    "Disciplina",
    "Constância",
    "Crescimento",
    "Shape",
    "Progresso",
    "Condicionamento",
    "Legado",
    "Auge",
    "Nível",
    "Ritmo",
    "Comando",
    "Domínio",
    "Império",
    "Pódio",
    "Aço",
    "Fogo",
    "Resultado",
    "Sucesso",
    "Cutting",
    "Bulking",
  ],
  complementos: [
    "sem Mimimi",
    "do Pump",
    "para Ficar Gigante",
    "até Falhar",
    "no Talento",
    "com Foco Total",
    "da Caverna",
    "sem Desculpa",
    "de Esparta",
    "de Gladiador",
    "no Hardcore",
    "rumo ao Topo",
    "a Todo Vapor",
    "sem Dó",
    "com Sangue nos Olhos",
    "até o Limite",
    "para Crescer Sem Parar",
    "na Raça",
    "no Volume Máximo",
    "com Carga Alta",
    "sem Descanso",
    "de Aço",
    "em Chamas",
    "sob Pressão",
    "contra a Gravidade",
    "entre Monstros",
    "por Merecimento",
    "para o Infinito",
    "na Marra",
    "com Honra",
    "até Virar Lenda",
    "em Modo Guerra",
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

// Fonte única dos rótulos de status (Patch v4): lista e detalhe consomem daqui.
export const STATUS_LABEL: Record<ProgramStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  inativo: "Inativo",
};

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
