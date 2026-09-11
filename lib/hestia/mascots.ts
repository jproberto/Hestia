/**
 * Mascotes do Héstia - Sistema de identidade visual por módulo
 *
 * Como adicionar novo módulo:
 * 1) PNG em public/mascots/ (ex: public/mascots/novo-modulo.png, 80x80, transparente ok)
 * 2) Entrada no MASCOT_REGISTRY com key, src, alt descritivo único
 * 3) Prefixo no ROUTE_TO_MASCOT (ex: '/novo-modulo': 'novo-modulo')
 * 4) Tamanhos disponíveis em MASCOT_SIZES (xs:24, sm:32, md:48, lg:80, xl:64)
 *
 * O resolver resolveMascotKey(pathname) faz:
 * - Match exato primeiro (ex: '/login')
 * - Match por prefixo ordenado por tamanho decrescente (ex: '/pluto/transactions' → '/pluto')
 * - Fallback para 'hestia' se nenhum match
 */

export type MascotKey = 'hestia' | 'pluto' | string

export interface MascotConfig {
  key: MascotKey
  src: string
  alt: string
}

export const MASCOT_SIZES = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 80,
  xl: 64,
} as const

export type SizeKey = keyof typeof MASCOT_SIZES

export const MASCOT_REGISTRY: Record<MascotKey, MascotConfig> = {
  hestia: {
    key: 'hestia',
    src: '/mascots/hestia.png',
    alt: 'Héstia, mascote do sistema Héstia',
  },
  pluto: {
    key: 'pluto',
    src: '/mascots/pluto.png',
    alt: 'Pluto, mascote do módulo financeiro',
  },
}

export const ROUTE_TO_MASCOT: Record<string, MascotKey> = {
  '/login': 'hestia',
  '/register': 'hestia',
  '/dashboard': 'hestia',
  '/pluto': 'pluto',
}

function isExactMatch(pathname: string, route: string): boolean {
  return pathname === route
}

function isPrefixMatch(pathname: string, prefix: string): boolean {
  return pathname.startsWith(prefix + '/') || pathname === prefix
}

export function resolveMascotKey(pathname: string): MascotKey {
  const exactMatch = Object.entries(ROUTE_TO_MASCOT).find(([route]) =>
    isExactMatch(pathname, route)
  )
  if (exactMatch) return exactMatch[1]

  const prefixMatches = Object.entries(ROUTE_TO_MASCOT)
    .filter(([route]) => isPrefixMatch(pathname, route))
    .sort((a, b) => b[0].length - a[0].length)

  if (prefixMatches.length > 0) return prefixMatches[0][1]

  return 'hestia'
}