import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import TransactionsPage from '@/app/pluto/transactions/page'
import { getTransactionsByMonth } from '@/lib/pluto/db/transactions'
import { getAccounts } from '@/lib/pluto/db/accounts'
import { getCategories } from '@/lib/pluto/db/categories'
import { getMonthlyPeriods, getAllOpenMonthlyPeriods } from '@/lib/pluto/db/months'
import { getBudgets } from '@/lib/pluto/db/budget'
import { getChecklistItemsByMonth, getGlobalChecklistItems } from '@/lib/pluto/db/checklist'
import { usePathname } from 'next/navigation'
import type {
  Account,
  BudgetItem,
  Category,
  ChecklistItem,
  MonthlyPeriod,
  TransactionWithDetails,
} from '@/lib/pluto/types'

interface TransactionsPageMockData {
  allOpenMonthlyPeriods: MonthlyPeriod[];
  monthlyPeriods: MonthlyPeriod[];
  budgets: BudgetItem[];
  transactions: TransactionWithDetails[];
  accounts: Account[];
  categories: Category[];
  checklistItems: ChecklistItem[];
  globalChecklistItems: ChecklistItem[];
}

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: 'teste@hestia.com' } } })
    }
  })
}))

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

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
  adjustBudgetItem: vi.fn(),
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
  return render(<TransactionsPage />)
}

const mockEmptyData: TransactionsPageMockData = {
  allOpenMonthlyPeriods: [],
  monthlyPeriods: [],
  budgets: [],
  transactions: [],
  accounts: [],
  categories: [],
  checklistItems: [],
  globalChecklistItems: [],
}

const mockHasData: TransactionsPageMockData = {
  allOpenMonthlyPeriods: [
    { id: 'p1', year: 2026, month: 3, status: 'aberto', created_at: '2026-03-01T00:00:00Z', created_by: 'teste@hestia.com' },
  ],
  monthlyPeriods: [
    { id: 'p1', year: 2026, month: 3, status: 'aberto', created_at: '2026-03-01T00:00:00Z', created_by: 'teste@hestia.com' },
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
      category_id: 'c1',
      account_id: 'a1',
      category_name: 'Alimentação',
      account_name: 'Itaú Corrente',
      created_at: '2026-03-15T00:00:00Z',
      created_by: 'teste@hestia.com',
    },
  ],
  accounts: [{ id: 'a1', name: 'Itaú Corrente', type: 'conta', created_at: null, created_by: null }],
  categories: [{ id: 'c1', name: 'Alimentação', type: 'despesa', created_at: '2026-01-01T00:00:00Z', created_by: 'teste@hestia.com' }],
  checklistItems: [],
  globalChecklistItems: [],
}

function setupMocks(data: TransactionsPageMockData) {
  ;(getAllOpenMonthlyPeriods as Mock).mockResolvedValue(data.allOpenMonthlyPeriods)
  ;(getMonthlyPeriods as Mock).mockResolvedValue(data.monthlyPeriods)
  ;(getBudgets as Mock).mockResolvedValue(data.budgets)
  ;(getTransactionsByMonth as Mock).mockResolvedValue(data.transactions)
  ;(getAccounts as Mock).mockResolvedValue(data.accounts)
  ;(getCategories as Mock).mockResolvedValue(data.categories)
  ;(getChecklistItemsByMonth as Mock).mockResolvedValue(data.checklistItems)
  ;(getGlobalChecklistItems as Mock).mockResolvedValue(data.globalChecklistItems)
}

describe('Transactions Page /pluto/transactions - Layout & Rendering', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('PlutoLayout wrapper', () => {
    it('renders Pluto module header with mascot and title', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
        expect(screen.getByText('Pluto')).toBeInTheDocument()
      })
    })

    it('renders Pluto navigation tabs', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByText('Orçamento Anual')).toBeInTheDocument()
        expect(screen.getByText('Meses e Períodos')).toBeInTheDocument()
        expect(screen.getAllByText('Lançamentos').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('renders page title and subtitle', async () => {
      setupMocks(mockHasData)

      renderTransactionsPage()

      await waitFor(() => {
        // Page title is in header (h1), nav has links
        const title = screen.getByRole('heading', { name: 'Lançamentos', level: 1 })
        expect(title).toBeInTheDocument()
        expect(screen.getByText('Registre e gerencie suas transações financeiras.')).toBeInTheDocument()
      })
    })

    it('renders back to dashboard link', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByTitle('Voltar ao Dashboard')).toBeInTheDocument()
      })
    })

    it('renders logout button', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByLabelText('Sair')).toBeInTheDocument()
      })
    })
  })

  describe('Empty state (no open months)', () => {
it('shows message when no months are open', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByText(/Nenhum mês está/i)).toBeInTheDocument()
        expect(screen.getByText('Aberto')).toBeInTheDocument()
        expect(screen.getByText(/para lançamentos\./i)).toBeInTheDocument()
        expect(screen.getByText('Ir para Gestão de Meses e Períodos 📅')).toBeInTheDocument()
      })
    })
    })

    it('does not render transactions grid when empty', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.queryByText('Supermercado')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading state', () => {
    it('renders without error while fetching data', async () => {
      setupMocks(mockEmptyData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
      })
    })
  })

  describe('Has data state', () => {
    it('renders budget comparison tables (Receitas and Despesas)', async () => {
      setupMocks(mockHasData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByText('📈 Receitas')).toBeInTheDocument()
        expect(screen.getByText('📉 Despesas')).toBeInTheDocument()
        // Estado assentado: 'Alimentação' aparece na linha do orçamento (Despesas)
        // e na linha do lançamento (grid de contas) — antes, o teste passava por
        // acidente numa janela transitória do duplo fetch (loading do 2º ciclo
        // desmontava o grid; ver ARC-002/task 45).
        expect(screen.getAllByText('Alimentação')).toHaveLength(2)
        expect(screen.getByText('Salário')).toBeInTheDocument()
      })
    })

    it('renders accounts and cards grid with transactions', async () => {
      setupMocks(mockHasData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByText('Contas e Cartões')).toBeInTheDocument()
        expect(screen.getByText('Itaú Corrente')).toBeInTheDocument()
        expect(screen.getByText('Supermercado')).toBeInTheDocument()
        expect(screen.getAllByText('R$ 200,00').length).toBeGreaterThan(0)
      })
    })

    it('shows month/year selectors', async () => {
      setupMocks(mockHasData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByLabelText('Ano:')).toBeInTheDocument()
        expect(screen.getByLabelText('Mês:')).toBeInTheDocument()
      })
    })

    it('shows month saldo', async () => {
      setupMocks(mockHasData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByText('💰 Saldo do Mês')).toBeInTheDocument()
      })
    })
  })

  describe('Checklist card', () => {
    it('renders checklist card when month is open', async () => {
      setupMocks(mockHasData)

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByText('Checklist de Contas a Pagar / Receber')).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    it('shows error message on data fetch error', async () => {
      ;(getAllOpenMonthlyPeriods as Mock).mockRejectedValue(new Error('DB error'))

      renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByText('DB error')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation between Pluto pages', () => {
    it('maintains Pluto module context when re-rendering', async () => {
      setupMocks(mockHasData)

      const { rerender } = renderTransactionsPage()

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
      })

      rerender(<TransactionsPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
        expect(screen.getByText('Pluto')).toBeInTheDocument()
      })
    })
  })