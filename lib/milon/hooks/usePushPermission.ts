"use client";

import { useCallback, useState } from "react";

export type PushPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export interface UsePushPermissionReturn {
  supported: boolean;
  permission: PushPermissionState;
  isStandalone: boolean;
  isIOS: boolean;
  requesting: boolean;
  requestPermission: () => Promise<void>;
}

function isNotificationSupported(): boolean {
  return typeof Notification !== "undefined";
}

function readPermission(): PushPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as PushPermissionState;
}

function detectStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(display-mode: standalone)").matches;
  }
  return false;
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Estado da permissão de notificação (Mílon #06, plan §3 e DA15).
 * Deriva `supported`/`permission` do ambiente, `isStandalone`
 * (display-mode standalone ou navigator.standalone do iOS Safari) e `isIOS`
 * do user agent. `requestPermission` só faz sentido invocado por gesto do
 * usuário; define `requesting`, atualiza `permission` com a resposta da API e
 * NUNCA lança (falha vira `denied`; sem suporte é no-op).
 */
export function usePushPermission(): UsePushPermissionReturn {
  const supported = isNotificationSupported();
  const [permission, setPermission] = useState<PushPermissionState>(
    readPermission,
  );
  const [requesting, setRequesting] = useState(false);
  const isStandalone = detectStandalone();
  const isIOS = detectIOS();

  const requestPermission = useCallback(async (): Promise<void> => {
    if (!isNotificationSupported()) {
      setPermission("unsupported");
      return;
    }
    setRequesting(true);
    try {
      const resposta = await Notification.requestPermission();
      setPermission(
        resposta === "granted" || resposta === "denied" ? resposta : "default",
      );
    } catch {
      setPermission("denied");
    } finally {
      setRequesting(false);
    }
  }, []);

  return {
    supported,
    permission,
    isStandalone,
    isIOS,
    requesting,
    requestPermission,
  };
}
