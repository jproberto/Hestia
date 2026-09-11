import { describe, it, expect } from 'vitest'
import {
  MascotKey,
  MascotConfig,
  MASCOT_REGISTRY,
  ROUTE_TO_MASCOT,
  resolveMascotKey,
  MASCOT_SIZES,
  SizeKey,
} from '@/lib/hestia/mascots'

describe('Mascot Registry & Resolver (TASK-1)', () => {
  describe('MASCOT_REGISTRY', () => {
    it('contains hestia key with correct config', () => {
      expect(MASCOT_REGISTRY).toHaveProperty('hestia')
      const hestia = MASCOT_REGISTRY.hestia
      expect(hestia).toMatchObject({
        key: 'hestia',
        src: expect.any(String),
        alt: 'Héstia, mascote do sistema Héstia',
      })
      expect(hestia.src).toBeTruthy()
      expect(hestia).not.toHaveProperty('width')
      expect(hestia).not.toHaveProperty('height')
    })

    it('contains pluto key with correct config', () => {
      expect(MASCOT_REGISTRY).toHaveProperty('pluto')
      const pluto = MASCOT_REGISTRY.pluto
      expect(pluto).toMatchObject({
        key: 'pluto',
        src: expect.any(String),
        alt: 'Pluto, mascote do módulo financeiro',
      })
      expect(pluto.src).toBeTruthy()
      expect(pluto).not.toHaveProperty('width')
      expect(pluto).not.toHaveProperty('height')
    })

    it('has unique descriptive alt text for each mascot', () => {
      const alts = Object.values(MASCOT_REGISTRY).map((m) => m.alt)
      expect(new Set(alts).size).toBe(alts.length)
    })
  })

  describe('ROUTE_TO_MASCOT', () => {
    it('maps exact routes to hestia', () => {
      expect(ROUTE_TO_MASCOT['/login']).toBe('hestia')
      expect(ROUTE_TO_MASCOT['/register']).toBe('hestia')
      expect(ROUTE_TO_MASCOT['/dashboard']).toBe('hestia')
    })

    it('maps /pluto prefix to pluto', () => {
      expect(ROUTE_TO_MASCOT['/pluto']).toBe('pluto')
    })
  })

  describe('resolveMascotKey', () => {
    it('resolves exact match /login to hestia', () => {
      expect(resolveMascotKey('/login')).toBe('hestia')
    })

    it('resolves exact match /register to hestia', () => {
      expect(resolveMascotKey('/register')).toBe('hestia')
    })

    it('resolves exact match /dashboard to hestia', () => {
      expect(resolveMascotKey('/dashboard')).toBe('hestia')
    })

    it('resolves /pluto/transactions to pluto (prefix match)', () => {
      expect(resolveMascotKey('/pluto/transactions')).toBe('pluto')
    })

    it('resolves /pluto/budget to pluto (prefix match)', () => {
      expect(resolveMascotKey('/pluto/budget')).toBe('pluto')
    })

    it('resolves /pluto/months to pluto (prefix match)', () => {
      expect(resolveMascotKey('/pluto/months')).toBe('pluto')
    })

    it('resolves /pluto to pluto (exact prefix)', () => {
      expect(resolveMascotKey('/pluto')).toBe('pluto')
    })

    it('fallback to hestia for unknown route', () => {
      expect(resolveMascotKey('/rota-inexistente')).toBe('hestia')
    })

    it('resolves root / to hestia', () => {
      expect(resolveMascotKey('/')).toBe('hestia')
    })

    it('prioritizes exact matches over prefix matches', () => {
      expect(resolveMascotKey('/login')).toBe('hestia')
      expect(resolveMascotKey('/pluto')).toBe('pluto')
    })

    it('prioritizes longer prefix matches', () => {
      expect(resolveMascotKey('/pluto/transactions')).toBe('pluto')
      expect(resolveMascotKey('/pluto/budget/overview')).toBe('pluto')
    })
  })

  describe('MASCOT_SIZES (NEW: TASK-1 spec v2)', () => {
    it('exports MASCOT_SIZES with 5 predefined sizes', () => {
      expect(MASCOT_SIZES).toEqual({
        xs: 24,
        sm: 32,
        md: 48,
        lg: 80,
        xl: 64,
      })
    })

    it('exports SizeKey as union of MASCOT_SIZES keys', () => {
      type ExpectedSizeKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
      const sizeKey: SizeKey = 'md'
      expect(sizeKey).toBe('md')
      // Type test: SizeKey should be assignable to ExpectedSizeKey
      const _check: ExpectedSizeKey = sizeKey
      expect(_check).toBe('md')
    })

    it('SizeKey allows all MASCOT_SIZES keys', () => {
      const sizes: SizeKey[] = ['xs', 'sm', 'md', 'lg', 'xl']
      sizes.forEach((s) => expect(MASCOT_SIZES[s]).toBeDefined())
    })
  })

  describe('MascotConfig without width/height (NEW: TASK-1 spec v2)', () => {
    it('MascotConfig type does not have width property', () => {
      const config: MascotConfig = {
        key: 'hestia',
        src: '/mascots/hestia.svg',
        alt: 'Héstia, mascote do sistema Héstia',
        // @ts-expect-error width should not exist on MascotConfig
        width: 120,
      }
    })

    it('MascotConfig type does not have height property', () => {
      const config: MascotConfig = {
        key: 'hestia',
        src: '/mascots/hestia.svg',
        alt: 'Héstia, mascote do sistema Héstia',
        // @ts-expect-error height should not exist on MascotConfig
        height: 120,
      }
    })

    it('MascotConfig only requires key, src, alt', () => {
      const config: MascotConfig = {
        key: 'hestia',
        src: '/mascots/hestia.svg',
        alt: 'Héstia, mascote do sistema Héstia',
      }
      expect(config.key).toBe('hestia')
      expect(config.src).toBe('/mascots/hestia.svg')
      expect(config.alt).toBe('Héstia, mascote do sistema Héstia')
    })
  })

  describe('MASCOT_REGISTRY without width/height (NEW: TASK-1 spec v2)', () => {
    it('hestia entry has only key, src, alt', () => {
      const hestia = MASCOT_REGISTRY.hestia
      expect(Object.keys(hestia)).toEqual(['key', 'src', 'alt'])
      expect(hestia).toMatchObject({
        key: 'hestia',
        src: '/mascots/hestia.png',
        alt: 'Héstia, mascote do sistema Héstia',
      })
      expect(hestia).not.toHaveProperty('width')
      expect(hestia).not.toHaveProperty('height')
    })

    it('pluto entry has only key, src, alt', () => {
      const pluto = MASCOT_REGISTRY.pluto
      expect(Object.keys(pluto)).toEqual(['key', 'src', 'alt'])
      expect(pluto).toMatchObject({
        key: 'pluto',
        src: '/mascots/pluto.png',
        alt: 'Pluto, mascote do módulo financeiro',
      })
      expect(pluto).not.toHaveProperty('width')
      expect(pluto).not.toHaveProperty('height')
    })

    it('registry entries are consistent (all have only key, src, alt)', () => {
      Object.values(MASCOT_REGISTRY).forEach((mascot) => {
        expect(Object.keys(mascot)).toEqual(['key', 'src', 'alt'])
      })
    })
  })

  describe('Types (existing)', () => {
    it('MascotKey accepts hestia and pluto', () => {
      const key1: MascotKey = 'hestia'
      const key2: MascotKey = 'pluto'
      expect(key1).toBe('hestia')
      expect(key2).toBe('pluto')
    })

    it('MascotConfig has required properties (key, src, alt only)', () => {
      const config: MascotConfig = {
        key: 'hestia',
        src: '/mascots/hestia.svg',
        alt: 'Héstia, mascote do sistema Héstia',
      }
      expect(config.key).toBe('hestia')
      expect(config.src).toBe('/mascots/hestia.svg')
      expect(config.alt).toBe('Héstia, mascote do sistema Héstia')
    })
  })
})