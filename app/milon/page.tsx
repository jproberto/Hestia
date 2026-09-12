import { MilonLayout } from "@/components/milon/MilonLayout";

export default function MilonPage() {
  return (
    <MilonLayout pageTitle="Mílon" pageSubtitle="Página inicial do módulo Mílon">
      <main className="flex flex-col gap-4">
        <p className="text-muted-foreground">
          Módulo Mílon criado com sucesso. Adicione suas páginas aqui.
        </p>
      </main>
    </MilonLayout>
  );
}
