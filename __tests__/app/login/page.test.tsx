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

describe('Login Page - Contract Tests (RED)', () => {
  beforeEach(() => {
    cleanup()
    mockUsePathname.mockReturnValue('/login')
  })

  describe('renders MascotBackground wrapping entire page content', () => {
    it('renders MascotBackground with mode="prominent"', () => {
      renderWithMascotProvider(<LoginPage />)
      const bgDiv = document.querySelector('.mascot-background')
      expect(bgDiv).toBeInTheDocument()
      expect(bgDiv).toHaveClass('mascot-transition')
    })

    it('MascotBackground wraps the entire page content', () => {
      renderWithMascotProvider(<LoginPage />)
      const bgDiv = document.querySelector('.mascot-background')
      expect(bgDiv).toBeInTheDocument()

      const header = screen.getByText('Hestia')
      expect(bgDiv).toContainElement(header)

      const description = screen.getByText('Entre com seu email e senha')
      expect(bgDiv).toContainElement(description)

      const form = screen.getByRole('form')
      expect(bgDiv).toContainElement(form)
    })
  })

  describe('background: Hestia mascot, cover, dark overlay 70%, white text', () => {
    it('sets --mascot-bg-opacity to 1 (prominent mode)', () => {
      renderWithMascotProvider(<LoginPage />)
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv).toBeInTheDocument()
      expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
    })

    it('sets dark overlay background to 70% (oklch(0.145 0 0 / 0.7))', () => {
      renderWithMascotProvider(<LoginPage />)
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
    })

    it('sets overlay text color to white (oklch(0.985 0 0))', () => {
      renderWithMascotProvider(<LoginPage />)
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('oklch(0.985 0 0)')
    })

    it('sets --mascot-bg-lqip from hestia mascot', () => {
      renderWithMascotProvider(<LoginPage />)
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
    })
  })

  describe('LQIP inline style present on SSR (no layout shift)', () => {
    it('includes --mascot-bg-lqip CSS variable in inline style', () => {
      renderWithMascotProvider(<LoginPage />)
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv).toHaveAttribute('style')
      expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
    })

    it('includes --mascot-transition-duration in inline style', () => {
      renderWithMascotProvider(<LoginPage />)
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-transition-duration')).toBe('300ms')
    })
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
      expect(title).toHaveClass("font-['CaesarDressing']")
    })
  })

  describe('integration test: renders prominent background, axe-core no violations', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderWithMascotProvider(<LoginPage />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('renders prominent background with correct CSS variables', () => {
      renderWithMascotProvider(<LoginPage />)
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement

      expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('oklch(0.985 0 0)')
      expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
      expect(bgDiv.style.getPropertyValue('--mascot-transition-duration')).toBe('300ms')
    })
  })
})