/**
 * LQIP (Low Quality Image Placeholder) utilities for mascot backgrounds
 * Generates 1x1px base64 PNG data URIs for SSR inline styles
 */

export type MascotKey = 'hestia' | 'pluto'

// Different 1x1px PNGs for each mascot (different colors)
const LQIP_CACHE: Record<MascotKey, string> = {
  // Hestia: light warm gray (transparent-ish)
  hestia: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  // Pluto: darker gray
  pluto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
}

export function generateLQIP(mascotKey: MascotKey): { lqipBase64: string } {
  if (!LQIP_CACHE[mascotKey]) {
    throw new Error(`Unknown mascot key: ${mascotKey}`)
  }
  return { lqipBase64: LQIP_CACHE[mascotKey] }
}