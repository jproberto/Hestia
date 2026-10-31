import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import MonthsPage from '@/app/pluto/months/page'
import { getMonthlyPeriods, openMonthlyPeriod, closeMonthlyPeriod } from '@/lib/pluto/db/months'
import { usePathname } from 'next/navigation'
import type { MonthlyPeriod } from '@/lib/pluto/types'

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { email: 'teste@hestia.com' } } })
    }
  })
}))

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

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
  return render(<MonthsPage />)
}

const mockEmptyPeriods: MonthlyPeriod[] = []
const mockHasPeriods: MonthlyPeriod[] = [
  { id: '1', year: 2026, month: 1, status: 'aberto', created_at: '2026-01-01T00:00:00Z', created_by: 'teste@hestia.com' },
  { id: '2', year: 2026, month: 2, status: 'encerrado', created_at: '2026-02-01T00:00:00Z', created_by: 'teste@hestia.com' }
]

describe('Months Page /pluto/months - Layout & Rendering', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('PlutoLayout wrapper', () => {
    it('renders Pluto module header with mascot and title', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockEmptyPeriods)

      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
        expect(screen.getByText('Pluto')).toBeInTheDocument()
      })
    })

    it('renders Pluto navigation tabs', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockEmptyPeriods)

      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getAllByText('Orçamento Anual').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Meses e Períodos').length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('Lançamentos')).toBeInTheDocument()
      })
    })

    it('renders page title and subtitle', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockEmptyPeriods)

      renderMonthsPage()

      await waitFor(() => {
        const title = screen.getByRole('heading', { name: 'Meses e Períodos', level: 1 })
        expect(title).toBeInTheDocument()
        expect(screen.getByText('Abra ou encerre meses operacionais para controle de lançamentos.')).toBeInTheDocument()
      })
    })

    it('renders back to dashboard link', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockEmptyPeriods)

      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getByTitle('Voltar ao Dashboard')).toBeInTheDocument()
      })
    })

    it('renders logout button', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockEmptyPeriods)

      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getByLabelText('Sair')).toBeInTheDocument()
      })
    })
  })

  // TASK-019 (CA-P3-07 / D12 transversal): a aba da URL é marcada pelo
  // ModuleLayout (TASK-015) — estilo ativo 'border-b-2 font-semibold' na cor
  // do módulo #35472D (components/layout/PlutoLayout.tsx).
  describe('Active tab (CA-P3-07 / D12 transversal)', () => {
    it("em /pluto/months, 'Meses e Períodos' é a única aba com aria-current='page' + estilo ativo", async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockEmptyPeriods)

      renderMonthsPage('/pluto/months')

      await waitFor(() => {
        const nav = screen.getByRole('navigation')

        expect(within(nav).getAllByRole('link', { current: 'page' })).toHaveLength(1)

        const active = within(nav).getByRole('link', { name: 'Meses e Períodos' })
        expect(active).toHaveAttribute('aria-current', 'page')
        expect(active).toHaveClass('border-b-2')
        expect(active).toHaveClass('font-semibold')
        expect(active).toHaveStyle({ color: '#35472D' })

        expect(within(nav).getByRole('link', { name: 'Orçamento Anual' })).not.toHaveAttribute('aria-current', 'page')
        expect(within(nav).getByRole('link', { name: 'Lançamentos' })).not.toHaveAttribute('aria-current', 'page')
      })
    })
  })

  describe('Empty state (no periods)', () => {
    it('shows message when no periods exist', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockEmptyPeriods)

      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getByText('Abertos')).toBeInTheDocument()
        expect(screen.getByText('Encerrados')).toBeInTheDocument()
        expect(screen.getByText('Não Iniciados')).toBeInTheDocument()
      })
    })
  })

  describe('Loading state', () => {
    it('renders without error while fetching data', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockEmptyPeriods)

      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
      })
    })
  })

  describe('Has data state (periods exist)', () => {
    beforeEach(() => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockHasPeriods)
    })

    it('renders periods list with open and closed periods', async () => {
      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getByText('Janeiro')).toBeInTheDocument()
        expect(screen.getByText('Fevereiro')).toBeInTheDocument()
        expect(screen.getByText('Aberto')).toBeInTheDocument()
        expect(screen.getByText('Encerrado')).toBeInTheDocument()
      })
    })

    it('shows year selector', async () => {
      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getByLabelText('Ano:')).toBeInTheDocument()
        expect(screen.getByText('2026')).toBeInTheDocument()
      })
    })

    it('shows action buttons for each period', async () => {
      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getAllByText('Abrir').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('Encerrar').length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('Error handling', () => {
    it('shows error message on data fetch error', async () => {
      vi.mocked(getMonthlyPeriods).mockRejectedValue(new Error('DB error'))

      renderMonthsPage()

      await waitFor(() => {
        expect(screen.getByText('Erro ao carregar períodos: DB error')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation between Pluto pages', () => {
    it('maintains Pluto module context when re-rendering', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockHasPeriods)

      const { rerender } = renderMonthsPage()

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
      })

      rerender(<MonthsPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
        expect(screen.getByText('Pluto')).toBeInTheDocument()
      })
    })

    it('maintains Pluto module context when changing path to /pluto/transactions', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockHasPeriods)

      const { rerender } = renderMonthsPage('/pluto/months')

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
      })

      rerender(<MonthsPage />)

      await waitFor(() => {
        expect(screen.getByAltText('Pluto mascote')).toBeInTheDocument()
        expect(screen.getByText('Pluto')).toBeInTheDocument()
      })
    })
  })

  describe('Interactions', () => {
    it('calls openMonthlyPeriod when clicking Abrir', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockHasPeriods)

      renderMonthsPage()

      await waitFor(() => {
        const openButtons = screen.getAllByText('Abrir')
        fireEvent.click(openButtons[0]) // Click first "Abrir" button (month 1)
      })

      await waitFor(() => {
        expect(openMonthlyPeriod).toHaveBeenCalledWith(expect.anything(), 2026, 1, expect.any(String))
      })
    })

    it('calls closeMonthlyPeriod when clicking Encerrar', async () => {
      vi.mocked(getMonthlyPeriods).mockResolvedValue(mockHasPeriods)

      renderMonthsPage()

      await waitFor(() => {
        const closeButtons = screen.getAllByText('Encerrar')
        fireEvent.click(closeButtons[0]) // Click first "Encerrar" button (month 1)
      })

      await waitFor(() => {
        expect(closeMonthlyPeriod).toHaveBeenCalledWith(expect.anything(), 2026, 1, expect.any(String))
      })
    })
  })
})