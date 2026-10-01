import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import DashboardPage from '@/app/dashboard/page'
import { usePathname } from 'next/navigation'
import { MascotProvider } from '@/lib/hestia/MascotProvider'

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

// Client Supabase mockado globalmente em __tests__/setup.ts (task 49).

const mockUsePathname = usePathname as Mock

function renderDashboardWithProvider(pathname = '/dashboard') {
  mockUsePathname.mockReturnValue(pathname)
  return render(
    <MascotProvider>
      <DashboardPage />
    </MascotProvider>
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/dashboard')
  })

  it('renders dashboard page content', () => {
    renderDashboardWithProvider()
    expect(screen.getByText('Painel de Ferramentas')).toBeInTheDocument()
    expect(screen.getByText('Acesse seus utilitários familiares.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Pluto/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sair/ })).toBeInTheDocument()
  })

  it('does not render inline Mascot in header', () => {
    renderDashboardWithProvider()
    const headerMascot = document.querySelector('mascot[size="md"], [data-testid="header-mascot"]')
    expect(headerMascot).not.toBeInTheDocument()
  })

  it('does not render MascotBackground layer (VIS-001)', async () => {
    renderDashboardWithProvider()
    await waitFor(() => {
      expect(screen.getByText('Painel de Ferramentas')).toBeInTheDocument()
    })
    expect(document.querySelector('.mascot-background')).not.toBeInTheDocument()
  })

  it('renders Milon card with D13 text linking to the Mílon module', () => {
    renderDashboardWithProvider()
    const milonLink = screen.getByRole('link', { name: /Mílon/ })
    expect(milonLink).toBeInTheDocument()
    expect(milonLink).toHaveAttribute('href', '/milon')
    // CA-P3-08: texto exato do card Mílon (D13)
    expect(screen.getByText('Módulo de Acompanhamento de Treinos e Evolução')).toBeInTheDocument()
    // CA-P3-10: texto antigo removido
    expect(screen.queryByText('Acesse a biblioteca de exercícios da academia.')).toBeNull()
  })

  it('renders Pluto card with D13 text linking to the budget', () => {
    renderDashboardWithProvider()
    const plutoLink = screen.getByRole('link', { name: /Pluto/ })
    expect(plutoLink).toBeInTheDocument()
    expect(plutoLink).toHaveAttribute('href', '/pluto/budget')
    // CA-P3-08: texto exato do card Pluto (D13)
    expect(screen.getByText('Módulo Orçamentário e Financeiro')).toBeInTheDocument()
    // CA-P3-10: texto antigo removido
    expect(
      screen.queryByText(
        'Acesse o controle de orçamento anual, categorias de receitas e despesas previstas.'
      )
    ).toBeNull()
  })
})
