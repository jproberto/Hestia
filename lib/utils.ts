import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseErrorMessage(err: unknown): string {
  if (!err) return "Erro desconhecido";
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message) return obj.message;
    if (typeof obj.details === "string" && obj.details) return obj.details;
    if (typeof obj.error_description === "string" && obj.error_description) return obj.error_description;
    try {
      return JSON.stringify(err);
    } catch {
      // fallback
    }
  }
  return String(err);
}
