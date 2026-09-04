import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import TransactionsPage from '@/app/pluto/transactions/page'
import { getTransactionsByMonth } from '@/lib/pluto/db/transactions'
import { getAccounts } from '@/lib/pluto/db/accounts'
import { getCategories } from '@/lib/pluto/db/categories'
import { getMonthlyPeriods, getAllOpenMonthlyPeriods } from '@/lib/pluto/db/months'
import { getBudgets } from '@/lib/pluto/db/budget'
import { getChecklistItemsByMonth, getGlobalChecklistItems } from '@/lib/pluto/db/checklist'
import { MascotProvider } from '@/lib/hestia/MascotProvider'
import { usePathname } from 'next/navigation'

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: 'teste@hestia.com' } } })
    }
  })
}))

vi.mock('@/lib/pluto/db/transactions', () => ({
  getTransactionsByMonth: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}))

vi.mock('@/lib/pluto/db/accounts', () => ({
  getAccounts: vi.fn(),
  getOrCreateAccount: vi.fn(),
}))

vi.mock('@/lib/pluto/db/categories', () => ({
  getCategories: vi.fn(),
  getOrCreateCategory: vi.fn(),
}))

vi.mock('@/lib/pluto/db/months', () => ({
  getMonthlyPeriods: vi.fn(),
  getAllOpenMonthlyPeriods: vi.fn(),
}))

vi.mock('@/lib/pluto/db/budget', () => ({
  getBudgets: vi.fn(),
}))

vi.mock('@/lib/pluto/db/checklist', () => ({
  getChecklistItemsByMonth: vi.fn(),
  createChecklistItem: vi.fn(),
  updateChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  toggleChecklistItemCompletion: vi.fn(),
  getGlobalChecklistItems: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

const mockUsePathname = usePathname as Mock

function renderTransactionsPage(pathname = '/pluto/transactions') {
  mockUsePathname.mockReturnValue(pathname)
  return render(
    <MascotProvider>
      <TransactionsPage />
    </MascotProvider>
  )
}

const mockEmptyData = {
  allOpenMonthlyPeriods: [],
  monthlyPeriods: [],
  budgets: [],
  transactions: [],
  accounts: [],
  categories: [],
  checklistItems: [],
  globalChecklistItems: [],
}

const mockHasData = {
  allOpenMonthlyPeriods: [
    { id: 'p1', year: 2026, month: 3, status: 'aberto' },
  ],
  monthlyPeriods: [
    { id: 'p1', year: 2026, month: 3, status: 'aberto' },
  ],
  budgets: [
    { category_id: 'c1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 },
    { category_id: 'c2', category_name: 'Salário', category_type: 'receita', amount: 5000, start_month: 1 },
  ],
  transactions: [
    {
      id: 't1',
      description: 'Supermercado',
      amount: 200,
      type: 'despesa',
      is_refund: false,
      date: '2026-03-15',
      category_name: 'Alimentação',
      account_name: 'Itaú Corrente',
      created_by: 'teste@hestia.com',
    },
  ],
  accounts: [{ id: 'a1', name: 'Itaú Corrente', type: 'conta' }],
  categories: [{ id: 'c1', name: 'Alimentação', type: 'despesa' }],
  checklistItems: [],
  globalChecklistItems: [],
}

function setupMocks(data: typeof mockEmptyData) {
  ;(getAllOpenMonthlyPeriods as Mock).mockResolvedValue(data.allOpenMonthlyPeriods)
  ;(getMonthlyPeriods as Mock).mockResolvedValue(data.monthlyPeriods)
  ;(getBudgets as Mock).mockResolvedValue(data.budgets)
  ;(getTransactionsByMonth as Mock).mockResolvedValue(data.transactions)
  ;(getAccounts as Mock).mockResolvedValue(data.accounts)
  ;(getCategories as Mock).mockResolvedValue(data.categories)
  ;(getChecklistItemsByMonth as Mock).mockResolvedValue(data.checklistItems)
  ;(getGlobalChecklistItems as Mock).mockResolvedValue(data.globalChecklistItems)
}

describe('Transactions Page /pluto/transactions - MascotBackground Contract Tests (RED)', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('MascotBackground wrapper', () => {
    it('wraps page content in MascotBackground', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background')
        expect(bgDiv).toBeInTheDocument()
      })
    })

    it('uses mascotKey="pluto"', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })
    })

    it('has no inline <Mascot size="md" /> in header', async () => {
      setupMocks(mockHasData)

      renderTransactionsPage()

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
      ;(getAllOpenMonthlyPeriods as Mock).mockReturnValue(loadingPromise)

      renderTransactionsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('oklch(0.985 0 0)')
      })

      resolveLoading!(mockEmptyData.allOpenMonthlyPeriods)
    })

    it('shows prominent Pluto background when empty (no open months)', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv).toBeInTheDocument()
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
        expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
      })
    })

    it('shows prominent Pluto background on error', async () => {
      ;(getAllOpenMonthlyPeriods as Mock).mockRejectedValue(new Error('DB error'))

      renderTransactionsPage()

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
      setupMocks(mockHasData)

      renderTransactionsPage()

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
      setupMocks(mockHasData)

      renderTransactionsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background')
        expect(bgDiv).toHaveClass('mascot-transition')
      })
    })

    it('sets --mascot-transition-duration to 300ms', async () => {
      setupMocks(mockHasData)

      renderTransactionsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-transition-duration')).toBe('300ms')
      })
    })

    it('maintains Pluto mascotKey when navigating between Pluto pages (cross-fade)', async () => {
      setupMocks(mockHasData)

      const { rerender } = renderTransactionsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })

      rerender(
        <MascotProvider>
          <TransactionsPage />
        </MascotProvider>
      )

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })
    })
  })

  describe('Integration: mode per state & cross-fade on route change', () => {
    it('transitions from prominent (empty) to watermark (has data) when data loads', async () => {
      setupMocks(mockEmptyData)

      const { rerender } = renderTransactionsPage()

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
      })

      setupMocks(mockHasData)

      rerender(
        <MascotProvider>
          <TransactionsPage />
        </MascotProvider>
      )

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('0.12')
        expect(bgDiv.style.contentVisibility).toBe('auto')
      })
    })

    it('maintains cross-fade when switching to /pluto/budget (same Pluto mascot)', async () => {
      setupMocks(mockHasData)

      renderTransactionsPage('/pluto/transactions')

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      })

      const { rerender } = renderTransactionsPage('/pluto/budget')

      await waitFor(() => {
        const bgDiv = document.querySelector('.mascot-background') as HTMLElement
        expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
        expect(bgDiv).toHaveClass('mascot-transition')
      })
    })
  })
})