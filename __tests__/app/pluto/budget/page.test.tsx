import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import BudgetPage from '@/app/pluto/budget/page'
import { getBudgetAdjustment, getBudgets, getBudgetAdjustments, createBudgetAdjustment } from '@/lib/pluto/db/budget'
import { getCategories } from '@/lib/pluto/db/categories'
import { useSearchParams } from 'next/navigation'
import { MascotProvider } from '@/lib/hestia/MascotProvider'
import { usePathname } from 'next/navigation'

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: 'teste@hestia.com' } } })
    }
  })
}))

vi.mock('@/lib/pluto/db/budget', () => ({
  getBudgetAdjustment: vi.fn(),
  initBudget: vi.fn(),
  getBudgets: vi.fn(),
  adjustBudgetItem: vi.fn(),
  getBudgetAdjustments: vi.fn(),
  createBudgetAdjustment: vi.fn(),
  addOrUpdateBudgetItem: vi.fn()
}))

vi.mock('@/lib/pluto/db/categories', () => ({
  getCategories: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  usePathname: vi.fn()
}))

const mockUsePathname = usePathname as Mock
const mockUseSearchParams = useSearchParams as Mock

function renderBudgetPage(pathname = '/pluto/budget', searchParams = new URLSearchParams('')) {
  mockUsePathname.mockReturnValue(pathname)
  mockUseSearchParams.mockReturnValue(searchParams)
  return render(
    <MascotProvider>
      <BudgetPage />
    </MascotProvider>
  )
}

describe('Budget Page /pluto/budget - MascotBackground Contract Tests (RED)', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('MascotBackground wrapper', () => {
    it('wraps page content in MascotBackground', async () => {
      ;(getBudgetAdjustment as Mock).mockResolvedValue(null)
      ;(getBudgetAdjustments as Mock).mockResolvedValue([])
      ;(getBudgets as Mock).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background')
        expect(bgDiv).toBeInTheDocument()
      })
    })

    it('uses mascotKey="pluto"', async () => {
      ;(getBudgetAdjustment as Mock).mockResolvedValue(null)
      ;(getBudgetAdjustments as Mock).mockResolvedValue([])
      ;(getBudgets as Mock).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })
    })

    it('has no inline <Mascot size="md" /> in header', async () => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue({ id: 'rev-1', year: 2026, start_month: 1 })
      vi.mocked(getBudgetAdjustments).mockResolvedValue([{ id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial' }])
      vi.mocked(getBudgets).mockResolvedValue([
        { category_id: 'cat-1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 }
      ])
      vi.mocked(getCategories).mockResolvedValue([{ id: 'cat-1', name: 'Alimentação', type: 'despesa' }])

      renderBudgetPage()

      await waitFor(() => {
        expect(screen.queryByAltText(/Pluto/i)).not.toBeInTheDocument()
        expect(screen.queryByAltText(/Héstia/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Mode: prominent (loading/empty/error)', () => {
    it('shows prominent Pluto background when loading', async () => {
      let resolveLoading: (value: unknown) => void
      const loadingPromise = new Promise((resolve) => { resolveLoading = resolve })
      ;(getBudgetAdjustment as Mock).mockReturnValue(loadingPromise)
      ;(getBudgetAdjustments as Mock).mockResolvedValue([])
      ;(getBudgets as Mock).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('oklch(0.985 0 0)')
      })

      resolveLoading!(null)
    })

    it('shows prominent Pluto background when empty (no revision)', async () => {
      ;(getBudgetAdjustment as Mock).mockResolvedValue(null)
      ;(getBudgetAdjustments as Mock).mockResolvedValue([])
      ;(getBudgets as Mock).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
      })
    })

    it('shows prominent Pluto background on error', async () => {
      ;(getBudgetAdjustment as Mock).mockRejectedValue(new Error('DB error'))
      ;(getBudgetAdjustments as Mock).mockResolvedValue([])
      ;(getBudgets as Mock).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
      })
    })
  })

  describe('Mode: watermark (has data)', () => {
    it('shows watermark Pluto (12% opacity) when has data', async () => {
      ;(getBudgetAdjustment as Mock).mockResolvedValue({ id: 'rev-1', year: 2026, start_month: 1 })
      ;(getBudgetAdjustments as Mock).mockResolvedValue([{ id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial' }])
      ;(getBudgets as Mock).mockResolvedValue([
        { category_id: 'cat-1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 }
      ])
      ;(getCategories as Mock).mockResolvedValue([{ id: 'cat-1', name: 'Alimentação', type: 'despesa' }])

      renderBudgetPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('0.12')
        expect(bgDiv.style.contentVisibility).toBe('auto')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('')
      })
    })
  })

  describe('Cross-fade transition', () => {
    it('includes mascot-transition class for 300ms cross-fade', async () => {
      ;(getBudgetAdjustment as Mock).mockResolvedValue({ id: 'rev-1', year: 2026, start_month: 1 })
      ;(getBudgetAdjustments as Mock).mockResolvedValue([{ id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial' }])
      ;(getBudgets as Mock).mockResolvedValue([
        { category_id: 'cat-1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 }
      ])
      ;(getCategories as Mock).mockResolvedValue([{ id: 'cat-1', name: 'Alimentação', type: 'despesa' }])

      renderBudgetPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background')
        expect(bgDiv).toHaveClass('mascot-transition')
      })
    })

    it('sets --mascot-transition-duration to 300ms', async () => {
      ;(getBudgetAdjustment as Mock).mockResolvedValue({ id: 'rev-1', year: 2026, start_month: 1 })
      ;(getBudgetAdjustments as Mock).mockResolvedValue([{ id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial' }])
      ;(getBudgets as Mock).mockResolvedValue([
        { category_id: 'cat-1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 }
      ])
      ;(getCategories as Mock).mockResolvedValue([{ id: 'cat-1', name: 'Alimentação', type: 'despesa' }])

      renderBudgetPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-transition-duration')).toBe('300ms')
      })
    })

    it('maintains Pluto mascotKey when navigating between Pluto pages (cross-fade)', async () => {
      ;(getBudgetAdjustment as Mock).mockResolvedValue({ id: 'rev-1', year: 2026, start_month: 1 })
      ;(getBudgetAdjustments as Mock).mockResolvedValue([{ id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial' }])
      ;(getBudgets as Mock).mockResolvedValue([
        { category_id: 'cat-1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 }
      ])
      ;(getCategories as Mock).mockResolvedValue([{ id: 'cat-1', name: 'Alimentação', type: 'despesa' }])

      const { rerender } = renderBudgetPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })

      rerender(
        <MascotProvider>
          <BudgetPage />
        </MascotProvider>
      )

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })
    })
  })

  describe('Integration: mode per state & cross-fade on route change', () => {
    it('maintains cross-fade when switching to /pluto/months (same Pluto mascot)', async () => {
      ;(getBudgetAdjustment as Mock).mockResolvedValue({ id: 'rev-1', year: 2026, start_month: 1 })
      ;(getBudgetAdjustments as Mock).mockResolvedValue([{ id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial' }])
      ;(getBudgets as Mock).mockResolvedValue([
        { category_id: 'cat-1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 }
      ])
      ;(getCategories as Mock).mockResolvedValue([{ id: 'cat-1', name: 'Alimentação', type: 'despesa' }])

      renderBudgetPage('/pluto/budget')

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })

      const { rerender } = renderBudgetPage('/pluto/months')

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
        expect(bgDiv).toHaveClass('mascot-transition')
      })
    })
  })
})