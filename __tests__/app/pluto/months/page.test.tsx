import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import MonthsPage from '@/app/pluto/months/page'
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod } from '@/lib/pluto/db/months'
import { MascotProvider } from '@/lib/hestia/MascotProvider'
import { usePathname } from 'next/navigation'

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: 'teste@hestia.com' } } })
    }
  })
}))

vi.mock('@/lib/pluto/db/months', () => ({
  getMonthlyPeriods: vi.fn(),
  openMonthlyPeriod: vi.fn(),
  closeMonthlyPeriod: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

const mockUsePathname = usePathname as Mock

function renderMonthsPage(pathname = '/pluto/months') {
  mockUsePathname.mockReturnValue(pathname)
  return render(
    <MascotProvider>
      <MonthsPage />
    </MascotProvider>
  )
}

describe('Months Page /pluto/months - MascotBackground Contract Tests (RED)', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('MascotBackground wrapper', () => {
    it('wraps page content in MascotBackground', async () => {
      ;(getMonthlyPeriods as Mock).mockResolvedValue([])

      renderMonthsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background')
        expect(bgDiv).toBeInTheDocument()
      })
    })

    it('uses mascotKey="pluto"', async () => {
      ;(getMonthlyPeriods as Mock).mockResolvedValue([])

      renderMonthsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })
    })

    it('has no inline <Mascot size="md" /> in header', async () => {
      ;(getMonthlyPeriods as Mock).mockResolvedValue([])

      renderMonthsPage()

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
      ;(getMonthlyPeriods as Mock).mockReturnValue(loadingPromise)

      renderMonthsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('oklch(0.985 0 0)')
      })

      resolveLoading!([])
    })

    it('shows prominent Pluto background when empty (no periods)', async () => {
      ;(getMonthlyPeriods as Mock).mockResolvedValue([])

      renderMonthsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
      })
    })

    it('shows prominent Pluto background on error', async () => {
      ;(getMonthlyPeriods as Mock).mockRejectedValue(new Error('DB error'))

      renderMonthsPage()

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
      ;(getMonthlyPeriods as Mock).mockResolvedValue([
        { id: '1', year: 2026, month: 1, status: 'aberto', created_by: 'teste@hestia.com' },
        { id: '2', year: 2026, month: 2, status: 'encerrado', created_by: 'teste@hestia.com' }
      ])

      renderMonthsPage()

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
      ;(getMonthlyPeriods as Mock).mockResolvedValue([
        { id: '1', year: 2026, month: 1, status: 'aberto', created_by: 'teste@hestia.com' }
      ])

      renderMonthsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background')
        expect(bgDiv).toHaveClass('mascot-transition')
      })
    })

    it('sets --mascot-transition-duration to 300ms', async () => {
      ;(getMonthlyPeriods as Mock).mockResolvedValue([
        { id: '1', year: 2026, month: 1, status: 'aberto', created_by: 'teste@hestia.com' }
      ])

      renderMonthsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-transition-duration')).toBe('300ms')
      })
    })

    it('maintains Pluto mascotKey when navigating between Pluto pages (cross-fade)', async () => {
      ;(getMonthlyPeriods as Mock).mockResolvedValue([
        { id: '1', year: 2026, month: 1, status: 'aberto', created_by: 'teste@hestia.com' }
      ])

      const { rerender } = renderMonthsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })

      rerender(
        <MascotProvider>
          <MonthsPage />
        </MascotProvider>
      )

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })
    })
  })

  describe('Integration: mode per state & cross-fade on route change', () => {
    it('maintains cross-fade when switching to /pluto/transactions (same Pluto mascot)', async () => {
      ;(getMonthlyPeriods as Mock).mockResolvedValue([
        { id: '1', year: 2026, month: 1, status: 'aberto', created_by: 'teste@hestia.com' }
      ])

      renderMonthsPage('/pluto/months')

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })

      const { rerender } = renderMonthsPage('/pluto/transactions')

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
        expect(bgDiv).toHaveClass('mascot-transition')
      })
    })
  })
})