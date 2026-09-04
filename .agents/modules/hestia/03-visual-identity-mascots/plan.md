# Plan: Mascot Background Identity

## 1. Architecture Overview

**Approach**: CSS Variables (`--mascot-bg`) + Existing Context (`MascotProvider`) + CSS Transitions + `content-visibility` + LQIP (Alternative A from spec)

**Core Concept**: Replace current inline `<img>` mascots (icons) with CSS background images on page containers. Background state (prominent vs watermark) driven by data state (empty/loading/error vs has-data).

## 2. Components

### Create
| Component | Path | Purpose |
|-----------|------|---------|
| `MascotBackground` | `components/ui/MascotBackground.tsx` | Root background renderer using CSS `--mascot-bg` variable, handles cross-fade, LQIP, watermark/prominent modes |
| `useMascotBackground` | `lib/hestia/useMascotBackground.ts` | Hook exposing background state (mascot key, mode, transition class) derived from `MascotProvider` + page data state |
| LQIP utilities | `lib/hestia/mascot-lqip.ts` | Blur-hash/base64 1x1px generators for SSR inline styles |

### Modify
| Component | Path | Changes |
|-----------|------|---------|
| `app/layout.tsx` | Root layout | Add `MascotBackground` at body level; remove header `<Mascot size="sm" />` |
| `app/login/page.tsx` | Login page | Remove inline `<Mascot size="md" />`; page container gets prominent background via `MascotBackground` |
| `app/dashboard/page.tsx` | Dashboard page | Remove inline `<Mascot size="md" />`; integrate `useMascotBackground` for empty/data watermark toggle |
| `app/pluto/budget/page.tsx` | Budget page | Remove inline `<Mascot size="md" />`; integrate `useMascotBackground` |
| `app/pluto/months/page.tsx` | Months page | Remove inline `<Mascot size="md" />`; integrate `useMascotBackground` |
| `app/pluto/transactions/page.tsx` | Transactions page | Remove inline `<Mascot size="md" />`; integrate `useMascotBackground` |
| `components/pluto/ChecklistCard.tsx` | Checklist empty state | Replace `<Mascot size="lg" aria-hidden />` with background-driven approach (page-level) |
| `lib/hestia/MascotProvider.tsx` | Provider | Extend context with `previousMascotKey` for cross-fade transition tracking |
| `lib/hestia/mascots.ts` | Registry | Add `MASCOT_BG_MODES` type + helper for blur-hash (optional, can be static) |
| `app/globals.css` | Global styles | Add `--mascot-bg`, `--mascot-bg-opacity`, transition vars, overlay classes, watermark utilities, `prefers-reduced-motion` media query |

### Test
| Test File | Path | Scope |
|-----------|------|-------|
| `MascotBackground.test.tsx` | `__tests__/components/ui/MascotBackground.test.tsx` | Render modes, cross-fade, LQIP, a11y |
| `useMascotBackground.test.ts` | `__tests__/lib/hestia/useMascotBackground.test.ts` | State derivation, mode switching |
| `mascot-lqip.test.ts` | `__tests__/lib/hestia/mascot-lqip.test.ts` | Blur-hash generation |
| Integration tests | `__tests__/app/(login|dashboard|pluto)/*.test.tsx` | Page-level background behavior per state |

## 3. Contracts

### `MascotBackground` Props
```ts
interface MascotBackgroundProps {
  children: React.ReactNode
  mode?: 'prominent' | 'watermark'  // driven by page data state
  className?: string
}
```

### `useMascotBackground` Return
```ts
interface MascotBackgroundState {
  mascotKey: 'hestia' | 'pluto'
  previousMascotKey: 'hestia' | 'pluto' | null
  mode: 'prominent' | 'watermark'
  transitionClass: string  // 'mascot-transition' or 'mascot-transition-reduced'
  lqipStyle: React.CSSProperties  // inline --mascot-bg-lqip for SSR
}
```

### CSS Variables (globals.css)
```css
:root {
  --mascot-bg: url('/mascots/hestia.png');
  --mascot-bg-opacity: 1;           /* 1 = prominent, 0.12 = watermark */
  --mascot-bg-position: center;
  --mascot-bg-size: cover;
  --mascot-bg-lqip: 'data:image/png;base64,...';  /* 1x1px base64 */
  --mascot-transition-duration: 300ms;
  --mascot-overlay-bg: oklch(0.145 0 0 / 0.7);    /* 60-80% dark overlay */
  --mascot-overlay-text: oklch(0.985 0 0);        /* white text on overlay */
}

@media (prefers-reduced-motion: reduce) {
  :root { --mascot-transition-duration: 0ms; }
}
```

### Background Modes
| Mode | Opacity | Overlay | Use Case |
|------|---------|---------|----------|
| `prominent` | 1 (cover) | Dark 70% + white text | Empty, Loading, Error |
| `watermark` | 0.12 (bottom-right / repeat-x) | None | Has data |

## 4. Data Flow

```
Pathname change
    │
    ▼
MascotProvider.resolveMascotKey(pathname) → mascotKey (hestia/pluto)
    │
    ▼
MascotProvider tracks previousMascotKey for cross-fade
    │
    ▼
Page component reads data state (loading/empty/error/has-data)
    │
    ▼
useMascotBackground(mascotKey, dataState) → { mode, transitionClass, lqipStyle }
    │
    ▼
MascotBackground receives mode + transitionClass
    │
    ▼
CSS --mascot-bg + --mascot-bg-opacity + transition on background-image
    │
    ▼
Browser renders cross-fade (or instant if reduced-motion)
```

**SSR/Hydration**: `lqipStyle` injected inline on root `<div>` via `MascotBackground` → zero layout shift, PNG loads progressively.

## 5. Technical Decisions

| Decision | Rationale |
|----------|-----------|
| CSS `background-image` (not `next/image`) | Preserves original PNGs (2MB), spec requirement |
| CSS Variables for `--mascot-bg` | Declarative, zero JS runtime cost for transitions, works with `content-visibility` |
| Cross-fade via `transition: background-image 300ms` + opacity swap | Native, performant, respects `prefers-reduced-motion` via CSS media query |
| LQIP = 1x1px base64 (not blur-hash) | Simpler, 20B inline, sufficient for placeholder; blur-hash adds build complexity |
| `content-visibility: auto` on watermark layer | Defers paint of watermark until near viewport; prominent mode always visible |
| Page-level `MascotBackground` wrapper | Single source of truth per route; avoids multiple background layers |
| `previousMascotKey` in Context | Enables cross-fade on route change without external state |
| Overlay via `::before` pseudo-element | Semantic, no extra DOM, WCAG AA contrast via CSS vars |
| Watermark: `background-position: bottom right; background-repeat: no-repeat` | Subtle, non-competing with content; alternative `repeat-x` for wide views |

## 6. Migration Strategy (Per Task)

Each task = independent increment with own RED→GREEN cycle:

1. **Task 1**: CSS foundation (globals.css) + LQIP util + `MascotBackground` component (unit tests)
2. **Task 2**: Extend `MascotProvider` with `previousMascotKey` + `useMascotBackground` hook (unit tests)
3. **Task 3**: Login page integration (prominent only, no data state)
4. **Task 4**: Dashboard page integration (empty→prominent, data→watermark)
5. **Task 5**: Pluto pages integration (budget/months/transactions) — shared pattern
6. **Task 6**: Remove legacy `<Mascot />` icons from headers; cleanup
7. **Task 7**: Accessibility audit + cross-fade verification + mobile testing

## 7. File Changes Summary

**New Files** (4):
- `components/ui/MascotBackground.tsx`
- `lib/hestia/useMascotBackground.ts`
- `lib/hestia/mascot-lqip.ts`
- `app/globals.css` (append)

**Modified Files** (9):
- `app/layout.tsx`
- `app/login/page.tsx`
- `app/dashboard/page.tsx`
- `app/pluto/budget/page.tsx`
- `app/pluto/months/page.tsx`
- `app/pluto/transactions/page.tsx`
- `components/pluto/ChecklistCard.tsx`
- `lib/hestia/MascotProvider.tsx`
- `lib/hestia/mascots.ts`

**Test Files** (7+):
- Unit + integration per task