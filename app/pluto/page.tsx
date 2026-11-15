import { redirect } from "next/navigation";

/**
 * Raiz do módulo Pluto (Pluto 12 Navegação e Extrato).
 * Ponto neutro: redireciona para a aba padrão `/pluto/transactions`.
 */
export default function PlutoPage() {
  redirect("/pluto/transactions");
  return null;
}
