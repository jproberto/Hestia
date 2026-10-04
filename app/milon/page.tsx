import { redirect } from "next/navigation";

/**
 * Raiz do módulo Mílon (Mílon #4 Treino do Dia).
 * Ponto neutro: redireciona para a aba padrão `/milon/today`.
 */
export default function MilonPage() {
  redirect("/milon/today");
  return null;
}
