import { render, screen, waitFor, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import DashboardPage from '@/app/dashboard/page'
import { usePathname } from 'next/navigation'
import { MascotProvider, useMascotBackground } from '@/lib/hestia/MascotProvider'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: 'teste@hestia.com' } } }),
    },
  }),
}))

vi.mock('@/lib/pluto/db/budget', () => ({
  getBudgetAdjustment: vi.fn(),
}))

vi.mock('@/lib/shared/supabaseClient', () => ({
  createBrowserDatabaseClient: () => ({
    from: () => { throw new Error('use mocked db barrels in tests') },
    getUserEmail: () => Promise.resolve('teste@hestia.com'),
  }),
}))

const mockUsePathname = usePathname as Mock
const mockGetBudgetAdjustment = vi.mocked(await import('@/lib/pluto/db/budget')).getBudgetAdjustment

function renderDashboardWithProvider(pathname = '/dashboard') {
  mockUsePathname.mockReturnValue(pathname)
  return render(
    <MascotProvider>
      <DashboardPage />
    </MascotProvider>
  )
}

function TestComponentWithMode({ dataState }: { dataState: 'loading' | 'empty' | 'error' | 'has-data' }) {
  const { mode, transitionClass, lqipStyle, mascotKey } = useMascotBackground(dataState)
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="transition-class">{transitionClass}</span>
      <span data-testid="lqip-style">{JSON.stringify(lqipStyle)}</span>
      <span data-testid="mascot-key">{mascotKey}</span>
    </div>
  )
}

describe('DashboardPage - Contract Tests (RED)', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/dashboard')
  })

  describe('render and structure', () => {
    it('renders dashboard page content', () => {
      renderDashboardWithProvider()
      expect(screen.getByText('Painel de Ferramentas')).toBeInTheDocument()
      expect(screen.getByText('Acesse seus utilitários familiares.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Pluto/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Sair/ })).toBeInTheDocument()
    })

    it('wraps content in MascotBackground', () => {
      renderDashboardWithProvider()
      const bgDiv = document.querySelector('.mascot-background')
      expect(bgDiv).toBeInTheDocument()
      expect(bgDiv).toHaveClass('mascot-transition')
    })

    it('does not render inline Mascot in header', () => {
      renderDashboardWithProvider()
      const headerMascot = document.querySelector('mascot[size="md"], [data-testid="header-mascot"]')
      expect(headerMascot).not.toBeInTheDocument()
    })
  })

  describe('mode: prominent (loading state)', () => {
    it('Initial load (loading=true) → prominent Hestia background', () => {
      renderDashboardWithProvider()
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv).toBeInTheDocument()
      expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('oklch(0.985 0 0)')
      expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
    })

    it('useMascotBackground("loading") → mode === "prominent"', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      render(
        <MascotProvider>
          <TestComponentWithMode dataState="loading" />
        </MascotProvider>
      )
      expect(screen.getByTestId('mode').textContent).toBe('prominent')
      expect(screen.getByTestId('mascot-key').textContent).toBe('hestia')
    })
  })

  describe('mode: prominent (empty state - no revision)', () => {
    it('Empty state (no revision) → prominent Hestia background', () => {
      renderDashboardWithProvider()
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv).toBeInTheDocument()
      expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('oklch(0.985 0 0)')
    })

    it('useMascotBackground("empty") → mode === "prominent"', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      render(
        <MascotProvider>
          <TestComponentWithMode dataState="empty" />
        </MascotProvider>
      )
      expect(screen.getByTestId('mode').textContent).toBe('prominent')
    })
  })

  describe('mode: watermark (has data - revision exists)', () => {
    beforeEach(() => {
      mockGetBudgetAdjustment.mockResolvedValue({
        id: 'rev-1',
        year: new Date().getFullYear(),
        start_month: 1,
        description: 'Orçamento Inicial 2026',
        created_by: 'teste@hestia.com',
      })
    })

    it('Has data (revision exists) → watermark Hestia (12% opacity, bottom-right)', async () => {
      renderDashboardWithProvider()
      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('0.12')
      })
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv).toBeInTheDocument()
      expect(bgDiv.style.contentVisibility).toBe('auto')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('')
      expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
    })

    it('useMascotBackground("has-data") → mode === "watermark"', () => {
      mockUsePathname.mockReturnValue('/dashboard')
      render(
        <MascotProvider>
          <TestComponentWithMode dataState="has-data" />
        </MascotProvider>
      )
      expect(screen.getByTestId('mode').textContent).toBe('watermark')
      expect(screen.getByTestId('mascot-key').textContent).toBe('hestia')
    })
  })

  describe('transition', () => {
    it('includes mascot-transition class for cross-fade 300ms', () => {
      renderDashboardWithProvider()
      const bgDiv = document.querySelector('.mascot-background')
      expect(bgDiv).toHaveClass('mascot-transition')
    })

    it('sets --mascot-transition-duration to 300ms', () => {
      renderDashboardWithProvider()
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-transition-duration')).toBe('300ms')
    })

    it('integration: mode switching applies cross-fade class', async () => {
      mockUsePathname.mockReturnValue('/dashboard')
      const { rerender } = render(
        <MascotProvider>
          <TestComponentWithMode dataState="loading" />
        </MascotProvider>
      )

      expect(screen.getByTestId('mode').textContent).toBe('prominent')
      expect(screen.getByTestId('transition-class').textContent).toBe('mascot-transition')

      rerender(
        <MascotProvider>
          <TestComponentWithMode dataState="has-data" />
        </MascotProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('mode').textContent).toBe('watermark')
      })
      expect(screen.getByTestId('transition-class').textContent).toBe('mascot-transition')
    })
  })

  describe('CSS variables', () => {
    it('sets --mascot-bg-lqip from hestia (dashboard route)', () => {
      renderDashboardWithProvider()
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
    })
  })
})

describe('DashboardPage - Data State Integration (RED)', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/dashboard')
  })

  it('transitions from prominent (loading) to prominent (empty) to watermark (has-data)', async () => {
    const { rerender } = render(
      <MascotProvider>
        <TestComponentWithMode dataState="loading" />
      </MascotProvider>
    )

    expect(screen.getByTestId('mode').textContent).toBe('prominent')

    rerender(
      <MascotProvider>
        <TestComponentWithMode dataState="empty" />
      </MascotProvider>
    )
    expect(screen.getByTestId('mode').textContent).toBe('prominent')

    rerender(
      <MascotProvider>
        <TestComponentWithMode dataState="has-data" />
      </MascotProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('mode').textContent).toBe('watermark')
    })
  })

  it('transitionClass remains mascot-transition during mode changes', async () => {
    const { rerender } = render(
      <MascotProvider>
        <TestComponentWithMode dataState="loading" />
      </MascotProvider>
    )

    expect(screen.getByTestId('transition-class').textContent).toBe('mascot-transition')

    rerender(
      <MascotProvider>
        <TestComponentWithMode dataState="has-data" />
      </MascotProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('mode').textContent).toBe('watermark')
    })
    expect(screen.getByTestId('transition-class').textContent).toBe('mascot-transition')
  })
})