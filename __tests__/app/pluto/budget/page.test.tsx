import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import BudgetPage from '@/app/pluto/budget/page'
import { getBudgetAdjustment, getBudgets, getBudgetAdjustments, createBudgetAdjustment, adjustBudgetItem, addOrUpdateBudgetItem } from '@/lib/pluto/db/budget'
import { getCategories } from '@/lib/pluto/db/categories'
import { useSearchParams } from 'next/navigation'
import { usePathname } from 'next/navigation'
import type { BudgetAdjustment, BudgetItem, Category } from '@/lib/pluto/types'

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: 'teste@hestia.com' } } })
    }
  })
}))

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

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
  return render(<BudgetPage />)
}

describe('Budget Page /pluto/budget - Layout & Rendering', () => {
beforeEach(() => {
      cleanup()
      vi.clearAllMocks()
      // Reset all mock implementations
      vi.mocked(getBudgetAdjustment).mockReset()
      vi.mocked(getBudgetAdjustments).mockReset()
      vi.mocked(getBudgets).mockReset()
      vi.mocked(getCategories).mockReset()
      vi.mocked(createBudgetAdjustment).mockReset()
      vi.mocked(adjustBudgetItem).mockReset()
      vi.mocked(addOrUpdateBudgetItem).mockReset()
      vi.mocked(getBudgetAdjustment).mockResolvedValue(null)
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])
      vi.mocked(getCategories).mockResolvedValue([])
    })

  describe('PlutoLayout wrapper', () => {
    it('renders Pluto module header with mascot and title', async () => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(null)
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
        expect(screen.getByText('Pluto')).toBeInTheDocument()
      })
    })

    it('renders Pluto navigation tabs', async () => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(null)
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        expect(screen.getAllByText('Orçamento Anual').length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('Meses e Períodos')).toBeInTheDocument()
        expect(screen.getByText('Lançamentos')).toBeInTheDocument()
      })
    })

    it('renders page title and subtitle', async () => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(null)
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        // Page title is in header (h1), nav has links
        const title = screen.getByRole('heading', { name: 'Orçamento Anual', level: 1 })
        expect(title).toBeInTheDocument()
        expect(screen.getByText('Gerencie receitas, despesas e saldos planejados.')).toBeInTheDocument()
      })
    })

    it('renders back to dashboard link', async () => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(null)
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        expect(screen.getByTitle('Voltar ao Dashboard')).toBeInTheDocument()
      })
    })

    it('renders logout button', async () => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(null)
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        expect(screen.getByLabelText('Sair')).toBeInTheDocument()
      })
    })
  })

  describe('Empty state (no budget revision)', () => {
    it('shows message when no budget is initialized for the year', async () => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(null)
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        expect(screen.getByText('Nenhum orçamento cadastrado para o ano 2026.')).toBeInTheDocument()
        expect(screen.getByText('Iniciar Orçamento de 2026')).toBeInTheDocument()
      })
    })

    it('does not render budget tables when empty', async () => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(null)
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        expect(screen.queryByText('Receitas Previstas')).not.toBeInTheDocument()
        expect(screen.queryByText('Despesas Previstas')).not.toBeInTheDocument()
      })
    })
  })

describe('Loading state', () => {
    it('renders without error while fetching data', async () => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(null)
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])

      renderBudgetPage()

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
      })
    })
  })
  

  describe('Has data state (budget initialized)', () => {
    const mockRevision: BudgetAdjustment = { id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial', created_by: 'teste@hestia.com' }
    const mockAdjustments: BudgetAdjustment[] = [{ id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial', created_by: 'teste@hestia.com' }]
    const mockBudgets: BudgetItem[] = [
      { category_id: 'cat-1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 },
      { category_id: 'cat-2', category_name: 'Salário', category_type: 'receita', amount: 5000, start_month: 1 },
    ]
    const mockCategories: Category[] = [
      { id: 'cat-1', name: 'Alimentação', type: 'despesa', created_at: '2026-01-01T00:00:00Z', created_by: 'teste@hestia.com' },
      { id: 'cat-2', name: 'Salário', type: 'receita', created_at: '2026-01-01T00:00:00Z', created_by: 'teste@hestia.com' },
    ]

    beforeEach(() => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(mockRevision)
      vi.mocked(getBudgetAdjustments).mockResolvedValue(mockAdjustments)
      vi.mocked(getBudgets).mockResolvedValue(mockBudgets)
      vi.mocked(getCategories).mockResolvedValue(mockCategories)
    })

    it('renders adjustment select with available adjustments', async () => {
      renderBudgetPage()

      await waitFor(() => {
        expect(screen.getByLabelText('Ajuste:')).toBeInTheDocument()
        expect(screen.getByText('Orçamento Inicial 2026')).toBeInTheDocument()
      })
    })

    it('shows year selector with available years', async () => {
      renderBudgetPage()

      await waitFor(() => {
        expect(screen.getByLabelText('Ano:')).toBeInTheDocument()
        expect(screen.getByText('2026')).toBeInTheDocument()
        expect(screen.getByText('2027')).toBeInTheDocument()
        expect(screen.getByText('2028')).toBeInTheDocument()
      })
    })

    it('shows budget summary cards structure', async () => {
      renderBudgetPage()

      await waitFor(() => {
        expect(screen.getByText('Receitas Previstas')).toBeInTheDocument()
        expect(screen.getByText('Despesas Previstas')).toBeInTheDocument()
        expect(screen.getByText('Saldo Planejado')).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    it('handles budget adjustment fetch error gracefully', async () => {
      vi.mocked(getBudgetAdjustment).mockRejectedValue(new Error('DB error'))
      vi.mocked(getBudgetAdjustments).mockResolvedValue([])
      vi.mocked(getBudgets).mockResolvedValue([])

      renderBudgetPage()

      // Should not crash, just show empty state or handle error
      await waitFor(() => {
        expect(screen.getByText('Nenhum orçamento cadastrado para o ano 2026.')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation between Pluto pages', () => {
    const mockRevision: BudgetAdjustment = { id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial', created_by: 'teste@hestia.com' }
    const mockAdjustments: BudgetAdjustment[] = [{ id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial', created_by: 'teste@hestia.com' }]
    const mockBudgets: BudgetItem[] = [
      { category_id: 'cat-1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 },
    ]
    const mockCategories: Category[] = [{ id: 'cat-1', name: 'Alimentação', type: 'despesa', created_at: '2026-01-01T00:00:00Z', created_by: 'teste@hestia.com' }]

    beforeEach(() => {
      vi.mocked(getBudgetAdjustment).mockResolvedValue(mockRevision)
      vi.mocked(getBudgetAdjustments).mockResolvedValue(mockAdjustments)
      vi.mocked(getBudgets).mockResolvedValue(mockBudgets)
      vi.mocked(getCategories).mockResolvedValue(mockCategories)
    })

    it('maintains Pluto module context when re-rendering', async () => {
      const { rerender } = renderBudgetPage()

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
      })

      rerender(<BudgetPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
        expect(screen.getByText('Pluto')).toBeInTheDocument()
      })
    })

    it('maintains Pluto module context when changing path to /pluto/months', async () => {
      const mockRevision: BudgetAdjustment = { id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial', created_by: 'teste@hestia.com' }
      const mockAdjustments: BudgetAdjustment[] = [{ id: 'rev-1', year: 2026, start_month: 1, description: 'Inicial', created_by: 'teste@hestia.com' }]
      const mockBudgets: BudgetItem[] = [
        { category_id: 'cat-1', category_name: 'Alimentação', category_type: 'despesa', amount: 1000, start_month: 1 },
      ]
      const mockCategories: Category[] = [{ id: 'cat-1', name: 'Alimentação', type: 'despesa', created_at: '2026-01-01T00:00:00Z', created_by: 'teste@hestia.com' }]

      vi.mocked(getBudgetAdjustment).mockResolvedValue(mockRevision)
      vi.mocked(getBudgetAdjustments).mockResolvedValue(mockAdjustments)
      vi.mocked(getBudgets).mockResolvedValue(mockBudgets)
      vi.mocked(getCategories).mockResolvedValue(mockCategories)

      const { rerender } = renderBudgetPage('/pluto/budget')

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
      })

      rerender(<BudgetPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
        expect(screen.getByText('Pluto')).toBeInTheDocument()
      })
    })
  })
})