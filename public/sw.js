/* Service worker estático do Héstia — PWA mínimo (Mílon #06, plan §3).
   JavaScript puro, sem build e sem import. Apenas push / notificationclick /
   install / activate; SEM handler de fetch (nenhuma interceptação de rede,
   zero risco de cache stale de navegação). */

self.addEventListener("push", (event) => {
  let payload = null;
  try {
    payload = JSON.parse(event.data ? event.data.text() : "");
  } catch {
    payload = null;
  }

  // F2: exibir a notificação é obrigatório em TODOS os ramos — push recebido
  // sem exibir faz o Safari revogar a permissão. Ramo com payload JSON válido:
  if (payload && typeof payload.title === "string") {
    const body =
      typeof payload.body === "string" ? payload.body : "O descanso terminou.";
    const url = typeof payload.url === "string" ? payload.url : "/milon/today";
    event.waitUntil(
      self.registration.showNotification(payload.title, {
        body,
        data: { url },
      }),
    );
  } else {
    // Ramo de fallback genérico (payload ausente ou inválido):
    event.waitUntil(
      self.registration.showNotification("Descanso terminado", {
        body: "O descanso terminou.",
        data: { url: "/milon/today" },
      }),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const alvo = typeof data.url === "string" ? data.url : "/milon/today";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (!("focus" in client)) continue;
          // Já no alvo (compara o caminho — no navegador client.url é
          // absoluto): só foca, sem janela nova (contrato plan §3/DA11).
          if (client.url === alvo || client.url.endsWith(alvo)) {
            return client.focus();
          }
          // Outra rota do app: foca e navega até o alvo; sem navigate
          // (navegadores sem WindowClient.navigate) ou se ele falhar,
          // abre janela nova — o clique sempre leva a data.url.
          if ("navigate" in client) {
            return client
              .focus()
              .then(() => client.navigate(alvo))
              .catch(() => self.clients.openWindow(alvo));
          }
          return self.clients.openWindow(alvo);
        }
        // Nenhuma janela aberta: abre no alvo do payload (fallback
        // /milon/today quando o payload não traz url).
        return self.clients.openWindow(alvo);
      }),
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
