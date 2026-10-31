"use client";

import { useEffect } from "react";

/**
 * Registra o service worker estático (/sw.js) no mount — PWA mínimo
 * (Mílon #06, plan §1 Mudança 1). Falha de registro é engolida (catch
 * vazio) e nunca derruba o app; renderiza null (sem markup visível).
 */
export default function PwaRegistration() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
