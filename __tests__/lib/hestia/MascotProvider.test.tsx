import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MascotProvider, useMascot } from '@/lib/hestia/MascotProvider';
import { usePathname } from 'next/navigation';
import fs from 'fs';
import path from 'path';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const mockUsePathname = usePathname as Mock;

function TestComponent() {
  const { mascot, isFallback } = useMascot();
  return (
    <div>
      <span data-testid="mascot-key">{mascot.key}</span>
      <span data-testid="mascot-src">{mascot.src}</span>
      <span data-testid="mascot-alt">{mascot.alt}</span>
      <span data-testid="is-fallback">{String(isFallback)}</span>
    </div>
  );
}

function TestComponentWithContext() {
  const { mascot, isFallback, previousMascotKey } = useMascot();
  return (
    <div>
      <span data-testid="mascot-key">{mascot.key}</span>
      <span data-testid="mascot-src">{mascot.src}</span>
      <span data-testid="mascot-alt">{mascot.alt}</span>
      <span data-testid="is-fallback">{String(isFallback)}</span>
      <span data-testid="previous-mascot-key">{previousMascotKey ?? 'null'}</span>
    </div>
  );
}

describe('MascotProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/login');
  });

  it('é um Client Component (tem directive "use client")', () => {
    const filePath = path.resolve(__dirname, '../../../lib/hestia/MascotProvider.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('"use client"');
  });

  it('usa usePathname() e resolveMascotKey para determinar mascote atual', () => {
    mockUsePathname.mockReturnValue('/pluto/transactions');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('pluto');
    expect(screen.getByTestId('mascot-src').textContent).toBe('/mascots/pluto.png');
  });

  it('retorna mascote hestia para rota /login', () => {
    mockUsePathname.mockReturnValue('/login');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('hestia');
    expect(screen.getByTestId('is-fallback').textContent).toBe('false');
  });

  it('retorna mascote hestia para rota /dashboard', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('hestia');
    expect(screen.getByTestId('is-fallback').textContent).toBe('false');
  });

  it('retorna mascote pluto para rota /pluto (prefixo)', () => {
    mockUsePathname.mockReturnValue('/pluto');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('pluto');
    expect(screen.getByTestId('is-fallback').textContent).toBe('false');
  });

  it('retorna mascote pluto para rota /pluto/transactions', () => {
    mockUsePathname.mockReturnValue('/pluto/transactions');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('pluto');
    expect(screen.getByTestId('is-fallback').textContent).toBe('false');
  });

  it('retorna mascote pluto para rota /pluto/budget', () => {
    mockUsePathname.mockReturnValue('/pluto/budget');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('pluto');
    expect(screen.getByTestId('is-fallback').textContent).toBe('false');
  });

  it('retorna hestia como fallback para rota desconhecida', () => {
    mockUsePathname.mockReturnValue('/rota-inexistente');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('hestia');
    expect(screen.getByTestId('is-fallback').textContent).toBe('false');
  });

  it('retorna hestia como fallback para rota raiz /', () => {
    mockUsePathname.mockReturnValue('/');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('hestia');
    expect(screen.getByTestId('is-fallback').textContent).toBe('false');
  });

  it('isFallback === true quando mascote resolvido não existe no registry', () => {
    mockUsePathname.mockReturnValue('/modulo-sem-png');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('hestia');
    expect(screen.getByTestId('is-fallback').textContent).toBe('true');
  });

  it('useMascot() lança Error se chamado fora do MascotProvider', () => {
    function ComponentWithoutProvider() {
      useMascot();
      return <div>test</div>;
    }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<ComponentWithoutProvider />);
    }).toThrow('useMascot deve ser usado dentro de MascotProvider');
    consoleError.mockRestore();
  });

  it('atualiza mascote quando pathname muda (troca de rota)', async () => {
    mockUsePathname.mockReturnValue('/login');
    const { rerender } = render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('hestia');

    mockUsePathname.mockReturnValue('/pluto/transactions');
    rerender(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mascot-key').textContent).toBe('pluto');
    });
    expect(screen.getByTestId('is-fallback').textContent).toBe('false');
  });

  it('useMascot() retorna objeto com mascot (MascotConfig) e isFallback (boolean)', () => {
    mockUsePathname.mockReturnValue('/login');
    render(
      <MascotProvider>
        <TestComponent />
      </MascotProvider>
    );
    const mascotKey = screen.getByTestId('mascot-key').textContent;
    const mascotSrc = screen.getByTestId('mascot-src').textContent;
    const mascotAlt = screen.getByTestId('mascot-alt').textContent;
    const isFallback = screen.getByTestId('is-fallback').textContent;

    expect(mascotKey).toBeDefined();
    expect(mascotSrc).toBeDefined();
    expect(mascotAlt).toBeDefined();
    expect(isFallback === 'true' || isFallback === 'false').toBe(true);
  });
});

describe('MascotProvider - extended context with previousMascotKey (RED)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/login');
  });

  it('context includes previousMascotKey (initially null)', () => {
    mockUsePathname.mockReturnValue('/login');
    render(
      <MascotProvider>
        <TestComponentWithContext />
      </MascotProvider>
    );
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('null');
  });

  it('tracks previousMascotKey when pathname changes from /login to /pluto', async () => {
    mockUsePathname.mockReturnValue('/login');
    const { rerender } = render(
      <MascotProvider>
        <TestComponentWithContext />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('hestia');
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('null');

    mockUsePathname.mockReturnValue('/pluto/transactions');
    rerender(
      <MascotProvider>
        <TestComponentWithContext />
      </MascotProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mascot-key').textContent).toBe('pluto');
    });
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('hestia');
  });

  it('tracks previousMascotKey when pathname changes from /pluto to /dashboard', async () => {
    mockUsePathname.mockReturnValue('/pluto/transactions');
    const { rerender } = render(
      <MascotProvider>
        <TestComponentWithContext />
      </MascotProvider>
    );
    expect(screen.getByTestId('mascot-key').textContent).toBe('pluto');
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('null');

    mockUsePathname.mockReturnValue('/dashboard');
    rerender(
      <MascotProvider>
        <TestComponentWithContext />
      </MascotProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mascot-key').textContent).toBe('hestia');
    });
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('pluto');
  });

  it('previousMascotKey updates on every route change', async () => {
    mockUsePathname.mockReturnValue('/login');
    const { rerender } = render(
      <MascotProvider>
        <TestComponentWithContext />
      </MascotProvider>
    );
    expect(screen.getByTestId('previous-mascot-key').textContent).toBe('null');

    mockUsePathname.mockReturnValue('/pluto');
    rerender(
      <MascotProvider>
        <TestComponentWithContext />
      </MascotProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('previous-mascot-key').textContent).toBe('hestia');
    });

    mockUsePathname.mockReturnValue('/dashboard');
    rerender(
      <MascotProvider>
        <TestComponentWithContext />
      </MascotProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('previous-mascot-key').textContent).toBe('pluto');
    });
  });
});