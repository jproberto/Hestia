import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import LoginPage from '@/app/login/page'
import { MascotProvider } from '@/lib/hestia/MascotProvider'
import { usePathname, useRouter } from 'next/navigation'
import { axe, toHaveNoViolations } from 'jest-axe'

vi.mock('next/navigation', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    usePathname: vi.fn(),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      refresh: vi.fn(),
    })),
  }
})

const mockUsePathname = usePathname as Mock

expect.extend(toHaveNoViolations)

function renderWithMascotProvider(ui: React.ReactElement, pathname = '/login') {
  mockUsePathname.mockReturnValue(pathname)
  return render(
    <MascotProvider>
      {ui}
    </MascotProvider>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    cleanup()
    mockUsePathname.mockReturnValue('/login')
  })

  it('does not render MascotBackground layer (VIS-001)', () => {
    renderWithMascotProvider(<LoginPage />)
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(document.querySelector('.mascot-background')).not.toBeInTheDocument()
  })

  describe('header no longer contains <Mascot size="sm" />', () => {
    it('does not render Mascot component in header', () => {
      renderWithMascotProvider(<LoginPage />)
      const mascotElements = document.querySelectorAll('[data-testid="mascot-icon"], [data-mascot]')
      expect(mascotElements).toHaveLength(0)
    })

    it('renders Hestia text title instead of mascot icon', () => {
      renderWithMascotProvider(<LoginPage />)
      const title = screen.getByText('Hestia')
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass('text-9xl')
      expect(title).toHaveClass("font-display")
    })
  })

  describe('integration test: axe-core no violations', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderWithMascotProvider(<LoginPage />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
