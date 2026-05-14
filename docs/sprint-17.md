# Sprint 17 — Action Tests + CSP

## Objetivo

Cobrir com testes as server actions mais críticas do app e adicionar Content-Security-Policy ao conjunto de headers de segurança já existente.

---

## Feature 1 — Action Tests

### Estratégia

Mesmo padrão de mocking estabelecido na Sprint 16:

```typescript
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/queries/workspaces", () => ({ getCurrentWorkspace: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
```

Helper `makeChain(result)` cria um objeto thenable (implementa `.then()`) com todas as chamadas encadeáveis do Supabase (`.select()`, `.eq()`, `.update()`, `.delete()`). Isso permite que `await supabase.from("table").update({}).eq(...).eq(...)` resolva corretamente sem precisar rastrear qual `.eq()` é o último da cadeia.

### Extração de helper

`splitAmountIntoInstallments` foi extraída de `lib/actions/transactions.ts` (arquivo `"use server"`, que não permite exports de funções síncronas) para `lib/actions/installment-utils.ts`.

### Arquivos de teste

| Arquivo | Cobertura | Testes |
|---|---|---|
| `lib/actions/transactions.test.ts` | `splitAmountIntoInstallments` (puro), `createTransaction`, `updateTransaction`, `cancelTransaction`, `createTransfer`, `deleteTransfer` | ~26 |
| `lib/actions/budgets.test.ts` | `createBudget`, `deleteBudget`, `copyPreviousMonthBudgets` | ~13 |
| `lib/actions/goals.test.ts` | `createGoal`, `updateGoal`, `updateGoalProgress`, `completeGoal`, `cancelGoal` | ~17 |

**Total: 208 testes (152 → 208), 0 falhas.**

### Guards cobertos

Para cada action, os testes verificam:
- Schema inválido → `{ ok: false, fieldErrors }`
- Sem workspace → `{ ok: false }`
- Role viewer → `{ ok: false, message: /visualização/ }`
- Regra de negócio específica (ex: categoria duplicada, transação cancelada, valor > alvo)
- Erro no banco → `{ ok: false, message: dbErrorMessage }`
- Happy path → `{ ok: true, message: "..." }` + revalidatePath chamado

---

## Feature 2 — Content Security Policy

### Onde: `next.config.ts`

Adicionado header `Content-Security-Policy` ao array `securityHeaders` já existente. Dev e prod usam diretivas diferentes via `process.env.NODE_ENV`:

- **dev**: inclui `'unsafe-eval'` (Turbopack HMR exige)
- **prod**: sem `'unsafe-eval'`

### Diretivas

| Diretiva | Valor | Motivo |
|---|---|---|
| `default-src` | `'self'` | Fallback restritivo |
| `script-src` | `'self' 'unsafe-inline'` | Next.js App Router injeta inline scripts no hydration |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind CSS gera estilos inline |
| `img-src` | `'self' data: https:` | Imagens externas (avatares, etc) |
| `connect-src` | `'self' *.supabase.co wss://*.supabase.co accounts.google.com` | Supabase REST + Realtime + OAuth |
| `frame-src` | `accounts.google.com` | Popup OAuth Google |
| `frame-ancestors` | `'none'` | Previne clickjacking (mais abrangente que X-Frame-Options) |
| `base-uri` | `'self'` | Previne injeção de base tag |
| `form-action` | `'self'` | Server actions restritas à origem |

---

## Verificação final

```
npm test      → 208 testes, 0 falhas
npm run lint  → 0 erros
npm run build → 0 erros TypeScript
```
