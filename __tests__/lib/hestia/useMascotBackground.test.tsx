import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MascotProvider, useMascotBackground } from '@/lib/hestia/MascotProvider'
import { usePathname } from 'next/navigation'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

const mockUsePathname = usePathname as vi.Mock

function TestComponent({ dataState }: { dataState: 'loading' | 'empty' | 'error' | 'has-data' }) {
  const { mascotKey, previousMascotKey, mode, transitionClass, lqipStyle } = useMascotBackground(dataState)
  return (
    <div>
      <span data-testid="mascot-key">{mascotKey}</span>
      <span data-testid="previous-mascot-key">{previousMascotKey ?? 'null'}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="transition-class">{transitionClass}</span>
      <span data-testid="lqip-style">{JSON.stringify(lqipStyle)}</span>
    </div>
  )
}

describe('useMascotBackground - Contract Tests (RED)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/login')
  })

  describe('mode derivation from dataState', () => {
    it('useMascotBackground("loading") → mode === "prominent"', () => {
      mockUsePathname.mockReturnValue('/login')
      render(
        <MascotProvider>
          <TestComponent dataState="loading" />
        </MascotProvider>
      )
      expect(screen.getByTestId('mode').textContent).toBe('prominent')
    })

    it('useMascotBackground("empty") → mode === "prominent"', () => {
      mockUsePathname.mockReturnValue('/login')
      render(
        <MascotProvider>
          <TestComponent dataState="empty" />
        </MascotProvider>
      )
      expect(screen.getByTestId('mode').textContent).toBe('prominent')
    })

    it('useMascotBackground("error") → mode === "prominent"', () => {
      mockUsePathname.mockReturnValue('/login')
      render(
        <MascotProvider>
          <TestComponent dataState="error" />
        </MascotProvider>
      )
      expect(screen.getByTestId('mode').textContent).toBe('prominent')
    })

    it('useMascotBackground("has-data") → mode === "watermark"', () => {
      mockUsePathname.mockReturnValue('/login')
      render(
        <MascotProvider>
          <TestComponent dataState="has-data" />
        </MascotProvider>
      )
      expect(screen.getByTestId('mode').textContent).toBe('watermark')
    })
  })

  describe('lqipStyle', () => {
    it('lqipStyle contains --mascot-bg-lqip for current mascotKey (hestia)', () => {
      mockUsePathname.mockReturnValue('/login')
      render(
        <MascotProvider>
          <TestComponent dataState="loading" />
        </MascotProvider>
      )
      const lqipStyle = JSON.parse(screen.getByTestId('lqip-style').textContent!)
      expect(lqipStyle).toHaveProperty('--mascot-bg-lqip')
      expect(typeof lqipStyle['--mascot-bg-lqip']).toBe('string')
      expect(lqipStyle['--mascot-bg-lqip']).toMatch(/^data:image\/png;base64,/)
    })

    it('lqipStyle contains --mascot-bg-lqip for current mascotKey (pluto)', () => {
      mockUsePathname.mockReturnValue('/pluto/transactions')
      render(
        <MascotProvider>
          <TestComponent dataState="loading" />
        </MascotProvider>
      )
      const lqipStyle = JSON.parse(screen.getByTestId('lqip-style').textContent!)
      expect(lqipStyle).toHaveProperty('--mascot-bg-lqip')
      expect(typeof lqipStyle['--mascot-bg-lqip']).toBe('string')
      expect(lqipStyle['--mascot-bg-lqip']).toMatch(/^data:image\/png;base64,/)
    })
  })

  describe('transitionClass reduced-motion detection', () => {
    it('transitionClass === "mascot-transition" when prefers-reduced-motion is false', () => {
      mockUsePathname.mockReturnValue('/login')
      // Mock matchMedia to return false for reduced motion
      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })))

      render(
        <MascotProvider>
          <TestComponent dataState="loading" />
        </MascotProvider>
      )
      expect(screen.getByTestId('transition-class').textContent).toBe('mascot-transition')
    })

    it('transitionClass === "mascot-transition-reduced" when prefers-reduced-motion is true', () => {
      mockUsePathname.mockReturnValue('/login')
      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })))

      render(
        <MascotProvider>
          <TestComponent dataState="loading" />
        </MascotProvider>
      )
      expect(screen.getByTestId('transition-class').textContent).toBe('mascot-transition-reduced')
    })
  })

  describe('returns all expected properties', () => {
    it('returns mascotKey, previousMascotKey, mode, transitionClass, lqipStyle', () => {
      mockUsePathname.mockReturnValue('/login')
      render(
        <MascotProvider>
          <TestComponent dataState="loading" />
        </MascotProvider>
      )
      expect(screen.getByTestId('mascot-key').textContent).toBeTruthy()
      expect(screen.getByTestId('previous-mascot-key').textContent).toBeTruthy()
      expect(screen.getByTestId('mode').textContent).toBeTruthy()
      expect(screen.getByTestId('transition-class').textContent).toBeTruthy()
      expect(screen.getByTestId('lqip-style').textContent).toBeTruthy()
    })
  })

  describe('throws when used outside MascotProvider', () => {
    it('useMascotBackground throws Error if called outside MascotProvider', () => {
      function ComponentWithoutProvider() {
        useMascotBackground('loading')
        return <div>test</div>
      }
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => {
        render(<ComponentWithoutProvider />)
      }).toThrow('useMascotBackground deve ser usado dentro de MascotProvider')
      consoleError.mockRestore()
    })
  })
})

describe('MascotProvider - previousMascotKey tracking (RED)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/login')
  })

  it('MascotProvider context includes previousMascotKey (initially null)', () => {
    mockUsePathname.mockReturnValue('/login')
    render(
      <MascotProvider>
        <TestComponent dataState="loading" />
      </MascotProvider>
    )
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('null')
  })

  it('tracks previousMascotKey when pathname changes from /login to /pluto', async () => {
    mockUsePathname.mockReturnValue('/login')
    const { rerender } = render(
      <MascotProvider>
        <TestComponent dataState="loading" />
      </MascotProvider>
    )
    expect(screen.getByTestId('mascot-key').textContent).toBe('hestia')
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('null')

    mockUsePathname.mockReturnValue('/pluto/transactions')
    rerender(
      <MascotProvider>
        <TestComponent dataState="loading" />
      </MascotProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('mascot-key').textContent).toBe('pluto')
    })
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('hestia')
  })

  it('tracks previousMascotKey when pathname changes from /pluto to /dashboard', async () => {
    mockUsePathname.mockReturnValue('/pluto/transactions')
    const { rerender } = render(
      <MascotProvider>
        <TestComponent dataState="loading" />
      </MascotProvider>
    )
    expect(screen.getByTestId('mascot-key').textContent).toBe('pluto')
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('null')

    mockUsePathname.mockReturnValue('/dashboard')
    rerender(
      <MascotProvider>
        <TestComponent dataState="loading" />
      </MascotProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('mascot-key').textContent).toBe('hestia')
    })
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('pluto')
  })

  it('previousMascotKey updates on every route change', async () => {
    mockUsePathname.mockReturnValue('/login')
    const { rerender } = render(
      <MascotProvider>
        <TestComponent dataState="loading" />
      </MascotProvider>
    )
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('null')

    mockUsePathname.mockReturnValue('/pluto')
    rerender(
      <MascotProvider>
        <TestComponent dataState="loading" />
      </MascotProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('previous-mascot-key').textContent).toBe('hestia')
    })

    mockUsePathname.mockReturnValue('/dashboard')
    rerender(
      <MascotProvider>
        <TestComponent dataState="loading" />
      </MascotProvider>
    )
    await waitFor(() => {
      expect(screen.getByTestId('previous-mascot-key').textContent).toBe('pluto')
    })
  })
})