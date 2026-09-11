# Spec: Mascot Background Identity

## 1. Problema Real
O usuário abre o app e não sente identidade visual — as telas são genéricas. Os mascotes (arte detalhada, 2MB cada) ficam escondidos como ícones minúsculos (24–80px). A dor é **falta de personalidade/branding e reconhecimento imediato de módulo**.

## 2. Usuários e Cenários
- **Usuário principal**: Família usando Héstia para finanças (Pluto) e tarefas
- **Cenários**:
  - Login/Register: primeira impressão de marca → Héstia proeminente
  - Dashboard vazio: sem dados → Héstia proeminente como hero
  - Páginas Pluto (budget, months, transactions) vazias/carregando/erro → Pluto proeminente
  - Telas com dados: watermark sutil (10-15% opacity)
  - Navegação entre módulos: cross-fade 300ms suave

## 3. Regras de Negócio
### Background por estado (não por rota fixa)
| Estado | Background | Overlay/Contraste |
|--------|------------|-------------------|
| **Vazio** (sem dados) | Proeminente (cover/contain) | Overlay semi-transparente escuro 60-80% → texto branco |
| **Carregando** | Proeminente + skeleton loader | Idem |
| **Erro** | Proeminente + alerta centralizado | Idem |
| **Com dados** | Watermark sutil (opacity 10-15%, bottom-right ou repeat-x) | Sem overlay extra |

### Transição entre módulos
- Cross-fade 300ms entre Héstia ↔ Pluto ao navegar `/dashboard` → `/pluto/*`
- Respeita `prefers-reduced-motion: reduce` (desliga animação instantânea)

### Mobile/Responsivo
- Background escala via `background-size: cover` / `contain`
- `content-visibility: auto` no watermark posterga paint até viewport
- Overlays mantêm contraste WCAG AA

### Acessibilidade
- `prefers-reduced-motion` desliga cross-fade
- Contraste texto/background via overlays semânticos
- Mascotes decorativos → `aria-hidden="true"` no elemento de background

### Performance (PNGs 2.2–2.3MB intactos)
- **Sem otimização/redimensionamento** dos PNGs originais
- LQIP: blur-hash (20B) ou base64 1x1px inline no HTML durante SSR
- `content-visibility: auto` no watermark
- CSS `background-image` nativo (não `next/image` — violaria restrição)
- Service Worker / pré-cache: **fora v1**

## 4. Fora de Escopo (YAGNI v1)
- Milon e quaisquer mascotes além de Héstia/Pluto
- Otimização/redimensionamento dos PNGs originais
- Temas customizados / A/B testing de identidade
- Animações além do cross-fade 300ms (sem parallax, micro-interações)
- Lazy-load avançado (IntersectionObserver) — `content-visibility` basta
- Fallback animado para `prefers-reduced-motion` — apenas desliga cross-fade
- Service Worker / pré-cache
- Mascote interativo (hover, click, easter eggs)

## 5. Critérios de Aceite (High-Level, Testáveis)
1. **Login** exibe Héstia como background proeminente (cover), overlay escuro, texto legível
2. **Dashboard vazio** exibe Héstia proeminente; com dados → watermark sutil 10-15%
3. **Páginas Pluto vazias/carregando/erro** exibem Pluto proeminente; com dados → watermark
4. **Navegação `/dashboard` → `/pluto/transactions`** faz cross-fade 300ms entre backgrounds
5. **`prefers-reduced-motion`** desliga cross-fade (troca instantânea)
6. **Mobile** background cobre viewport, watermark não compete com conteúdo
7. **PNGs originais** servidos de `/public/mascots/` sem modificação (hash idêntico)
8. **SSR/hidratação** sem layout shift (LQIP inline no HTML)
9. **Acessibilidade**: axe-core sem violações em todos os estados

## 6. Riscos e Dependências
- **Risco**: PNGs 2MB podem impactar LCP no login (mitigação: preload crítico + LQIP)
- **Dependência**: `MascotProvider` + `resolveMascotKey()` existentes em `lib/hestia/`
- **Dependência**: Tokens de cor em `app/globals.css` para overlays

## 7. Alternativas Consideradas
| Alternativa | Abordagem | Trade-offs | Escolha |
|-------------|-----------|------------|---------|
| **A** (Recomendada) | CSS Variables (`--mascot-bg`) + Context (`MascotProvider`) + CSS Transitions + `content-visibility` + LQIP | Baixo custo, zero deps, PNGs intactos, declarativo | ✅ |
| B | Inline Style + `usePathname()` + Framer Motion | Médio custo, adiciona ~50KB, re-renders, animações além do escopo | ❌ |
| C | `next/image` + localStorage + CSS Transitions | **Viola restrição** — Next.js otimiza/redimensiona PNGs originais | ❌ Bloqueada |

**Recomendação**: Alternativa A — alinhada com todas as decisões consolidadas, zero novas dependências, preserva PNGs originais, usa infraestrutura existente.