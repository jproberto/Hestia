import { redirect } from "next/navigation";

/**
 * Raiz do módulo Mílon (Patch v3 P2 D9/D11, P3 R3, CA-P3-01).
 * Ponto neutro: redireciona para a aba padrão `/milon/programs`.
 * A biblioteca vive em `/milon/exercises`.
 */
export default function MilonPage() {
  redirect("/milon/programs");
  return null;
}
