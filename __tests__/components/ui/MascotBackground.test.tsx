import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MascotBackground } from '@/components/ui/MascotBackground'
import { MascotProvider } from '@/lib/hestia/MascotProvider'
import { usePathname } from 'next/navigation'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

const mockUsePathname = usePathname as vi.Mock

function renderWithMascotProvider(ui: React.ReactElement, pathname = '/login') {
  mockUsePathname.mockReturnValue(pathname)
  return render(
    <MascotProvider>
      {ui}
    </MascotProvider>
  )
}

describe('MascotBackground - Contract Tests (RED)', () => {
  beforeEach(() => {
    cleanup()
  })

  describe('render', () => {
    it('renders children', () => {
      renderWithMascotProvider(
        <MascotBackground>
          <div data-testid="child">Child Content</div>
        </MascotBackground>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('applies mascot-background class', () => {
      renderWithMascotProvider(
        <MascotBackground>
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background')
      expect(bgDiv).toBeInTheDocument()
    })

    it('applies custom className', () => {
      renderWithMascotProvider(
        <MascotBackground className="custom-class">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background.custom-class')
      expect(bgDiv).toBeInTheDocument()
    })
  })

  describe('mode: prominent', () => {
    it('sets --mascot-bg-opacity to 1', () => {
      renderWithMascotProvider(
        <MascotBackground mode="prominent">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv).toBeInTheDocument()
      expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('1')
    })

    it('sets overlay CSS variables', () => {
      renderWithMascotProvider(
        <MascotBackground mode="prominent">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('oklch(0.145 0 0 / 0.7)')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('oklch(0.985 0 0)')
    })

    it('sets --mascot-bg-lqip from hestia by default', () => {
      renderWithMascotProvider(
        <MascotBackground mode="prominent">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
    })

    it('sets --mascot-bg-lqip from pluto when mascotKey="pluto"', () => {
      renderWithMascotProvider(
        <MascotBackground mode="prominent" mascotKey="pluto">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-bg-lqip')).toMatch(/^data:image\/png;base64,/)
    })
  })

  describe('mode: watermark', () => {
    it('sets --mascot-bg-opacity to 0.12', () => {
      renderWithMascotProvider(
        <MascotBackground mode="watermark">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-bg-opacity')).toBe('0.12')
    })

    it('does not set overlay CSS variables', () => {
      renderWithMascotProvider(
        <MascotBackground mode="watermark">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-bg')).toBe('')
      expect(bgDiv.style.getPropertyValue('--mascot-overlay-text')).toBe('')
    })

    it('sets content-visibility to auto', () => {
      renderWithMascotProvider(
        <MascotBackground mode="watermark">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.contentVisibility).toBe('auto')
    })
  })

  describe('transition', () => {
    it('includes mascot-transition class', () => {
      renderWithMascotProvider(
        <MascotBackground mode="prominent">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background')
      expect(bgDiv).toHaveClass('mascot-transition')
    })

    it('includes mascot-transition class for watermark', () => {
      renderWithMascotProvider(
        <MascotBackground mode="watermark">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background')
      expect(bgDiv).toHaveClass('mascot-transition')
    })
  })

  describe('CSS variables', () => {
    it('sets --mascot-transition-duration', () => {
      renderWithMascotProvider(
        <MascotBackground mode="prominent">
          <div />
        </MascotBackground>
      )
      const bgDiv = document.querySelector('.mascot-background') as HTMLElement
      expect(bgDiv.style.getPropertyValue('--mascot-transition-duration')).toBe('300ms')
    })
  })

  describe('props spreading', () => {
    it('spreads rest props to div', () => {
      renderWithMascotProvider(
        <MascotBackground data-testid="mascot-bg-container" mode="prominent">
          <div />
        </MascotBackground>
      )
      expect(screen.getByTestId('mascot-bg-container')).toBeInTheDocument()
    })
  })
})