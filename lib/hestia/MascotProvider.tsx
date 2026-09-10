"use client"

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { MascotConfig, resolveMascotKey, MASCOT_REGISTRY, ROUTE_TO_MASCOT, type MascotKey } from './mascots'

interface MascotContextValue {
  mascot: MascotConfig
  isFallback: boolean
  mascotKey: MascotKey
  previousMascotKey: MascotKey | null
}

export const MascotContext = createContext<MascotContextValue | null>(null)

function getFirstPathSegment(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  return segments[0] ?? ''
}

function isKnownModulePrefix(segment: string): boolean {
  return Object.keys(ROUTE_TO_MASCOT).some((route) => {
    const routeSegment = route.split('/').filter(Boolean)[0]
    return routeSegment === segment
  })
}

function isModulePathWithoutMascot(pathname: string): boolean {
  const firstSegment = getFirstPathSegment(pathname)
  return firstSegment.startsWith('modulo-') && !isKnownModulePrefix(firstSegment)
}

interface MascotProviderProps {
  children: ReactNode
  mascotKey?: MascotKey
}

export function MascotProvider({ children, mascotKey: explicitMascotKey }: MascotProviderProps) {
  const pathname = usePathname()
  const resolvedKey = explicitMascotKey ?? resolveMascotKey(pathname)
  const fallback = isModulePathWithoutMascot(pathname)
  const mascot = MASCOT_REGISTRY[resolvedKey] ?? MASCOT_REGISTRY.hestia

  const [previousMascotKey, setPreviousMascotKey] = useState<MascotKey | null>(null)
  const currentKeyRef = useRef(resolvedKey)

  useEffect(() => {
    if (currentKeyRef.current !== resolvedKey) {
      setPreviousMascotKey(currentKeyRef.current)
      currentKeyRef.current = resolvedKey
    }
  }, [resolvedKey])

  return (
    <MascotContext.Provider
      value={{
        mascot,
        isFallback: fallback,
        mascotKey: resolvedKey,
        previousMascotKey,
      }}
    >
      {children}
    </MascotContext.Provider>
  )
}

export function useMascot(): MascotContextValue {
  const context = useContext(MascotContext)
  if (!context) {
    throw new Error('useMascot deve ser usado dentro de MascotProvider')
  }
  return context
}