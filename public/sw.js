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
  const url = typeof data.url === "string" ? data.url : "/milon/today";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
