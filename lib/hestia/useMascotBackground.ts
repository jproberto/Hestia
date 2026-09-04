"use client"

import { useContext, useMemo, useEffect, useState } from 'react'
import { MascotContext } from './MascotProvider'
import type { MascotBgMode, MascotKey } from './mascots'

const LQIP_BASE64: Record<MascotKey, string> = {
  hestia: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4AWO4d5wNqFS9sWPHDgYmIiICGRmZ0DAsLAzZ2dnw8PDAysqKAcHmzZtJkL179wYA0PQdIADB7YQmAAAAAElFTkSuQmCC',
  pluto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4AWO4d5wNqFS9sWPHDgYmIiICGRmZ0DAsLAzZ2dnw8PDAysqKAcHmzZtJkL179wYA0PQdIADB7YQmAAAAAElFTkSuQmCC',
}

function getLqipForKey(key: MascotKey): string {
  return LQIP_BASE64[key] ?? LQIP_BASE64.hestia
}

function deriveMode(dataState: 'loading' | 'empty' | 'error' | 'has-data'): MascotBgMode {
  if (dataState === 'has-data') return 'watermark'
  return 'prominent'
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  return reduced
}

export function useMascotBackground(
  dataState: 'loading' | 'empty' | 'error' | 'has-data'
): {
  mascotKey: MascotKey
  previousMascotKey: MascotKey | null
  mode: MascotBgMode
  transitionClass: string
  lqipStyle: React.CSSProperties
} {
  const context = useContext(MascotContext)
  if (!context) {
    throw new Error('useMascotBackground deve ser usado dentro de MascotProvider')
  }

  const { mascotKey, previousMascotKey } = context
  const mode = useMemo(() => deriveMode(dataState), [dataState])
  const reducedMotion = useReducedMotion()
  const transitionClass = reducedMotion ? 'mascot-transition-reduced' : 'mascot-transition'
  const lqipStyle = useMemo<React.CSSProperties>(
    () => ({ '--mascot-bg-lqip': getLqipForKey(mascotKey) } as React.CSSProperties),
    [mascotKey]
  )

  return { mascotKey, previousMascotKey, mode, transitionClass, lqipStyle }
}