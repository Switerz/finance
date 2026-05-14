# Sprint 16 — Mobile PWA + Integration Tests

## Objetivo

Transformar o app em uma PWA instalável com suporte offline e mobile experience polida, e adicionar uma suite de testes de integração cobrindo a lógica de negócio das queries.

---

## Feature 1 — PWA

### Ícones programáticos

- `app/icon.tsx` — favicon 32×32 gerado via `ImageResponse` (círculo verde `#15803d`, "F" branco)
- `app/apple-icon.tsx` — Apple touch icon 180×180, mesmo motivo

### Manifest

`public/manifest.json` configurado com `display: standalone`, `start_url: /dashboard`, `theme_color: #15803d`.

### Viewport + metadata

`app/layout.tsx` agora exporta `viewport` separado de `metadata` (Next.js Viewport API):
- `viewportFit: "cover"` habilita `env(safe-area-inset-bottom)`
- `themeColor: "#15803d"` sincroniza cor da barra do sistema
- `appleWebApp: { capable: true }` habilita modo standalone no iOS

### Service Worker

`public/sw.js` — vanilla SW sem dependências externas:
- Cache-first para `/_next/static/`, ícones e manifest
- Network-first para rotas da app; fallback para `/offline` quando sem conexão
- `CACHE_VERSION` limpa caches antigos no evento `activate`

`components/pwa/sw-register.tsx` registra o SW no lado cliente via `useEffect`.  
Importado em `app/(app)/layout.tsx` para não carregar nas rotas públicas.

### Offline fallback

`app/offline/page.tsx` — página simples fora do layout autenticado, exibida quando o usuário navega offline.

### Safe area (notched devices)

- `components/layout/mobile-nav.tsx` — container `fixed bottom-0` com `pb-[env(safe-area-inset-bottom,0px)]`
- `components/layout/app-shell.tsx` — `<main>` com `paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))"`

---

## Feature 2 — Integration Tests

### Estratégia

Dois níveis:

1. **Pure functions** — helpers exportados de `transactions.ts`, `goals.ts` e `subscriptions.ts` testados sem mock nenhum
2. **Supabase mocked** — `getAccounts` testado com `vi.mock` em `createClient` e `getCurrentWorkspace`

### Fixtures

`lib/test-fixtures/index.ts` — factory builders tipados: `makeTransaction`, `makeAccount`, `makeBudget`, `makeSubscription`, `makeGoal`, `makeMonthlySeries`.

### Arquivos de teste

| Arquivo | Cobertura | Testes |
|---|---|---|
| `transactions.helper.test.ts` | `buildBudgetProjections`, `buildSavingsRateTrend`, `buildInsights`, `buildAlerts` | ~40 |
| `subscriptions.helper.test.ts` | `monthlyEquivalent`, `annualizedAmount`, `summarizeSubscriptions` | ~15 |
| `goals.helper.test.ts` | `goalDeadlineStatus`, `monthsUntil` | ~12 |
| `accounts.test.ts` | `getAccounts` — cálculo de saldo (income/expense/investment/transfer) | ~10 |

### Mudanças nos arquivos de produção

- `lib/queries/transactions.ts` — `buildBudgetProjections`, `buildSavingsRateTrend`, `buildInsights`, `buildAlerts` agora exportados
- `lib/queries/goals.ts` — `getDeadlineStatus` renomeado para `goalDeadlineStatus` e exportado
- `vitest.config.ts` — `coverage.include` expandido para `"lib/queries/**"`

---

## Verificação final

```
npm test      → 152 testes, 0 falhas
npm run lint  → 0 erros
npm run build → 0 erros TypeScript
```
