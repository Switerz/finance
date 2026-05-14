# Sprint 14 - QA, hardening e deploy

## Entrega

A Sprint 14 prepara o projeto para uso real com loading states, error boundaries, security headers, tipos completos do Supabase e cobertura de testes automatizados.

## Implementado

### Loading states

Criados arquivos `loading.tsx` em todas as rotas do app usando o componente `LoadingSkeleton` existente com a variante adequada para cada contexto:

- `/dashboard` → variante `page` (header + cards + charts)
- `/transactions` → variante `table`
- `/accounts` → variante `table`
- `/categories` → variante `table`
- `/budgets` → variante `table`
- `/goals` → variante `cards`
- `/subscriptions` → variante `table`
- `/reports` → variante `page`
- `/imports` → variante `page`
- `/settings` → variante `form`

### Error boundary global

Criado `app/(app)/error.tsx` como error boundary do Next.js para todas as rotas privadas. Exibe mensagem amigável com botão "Tentar novamente" que chama `reset()`. Registra o erro no console via `useEffect`.

### Security headers

Adicionados em `next.config.ts` via `headers()` para todas as rotas:

- `X-DNS-Prefetch-Control: on`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

### Tipos do Supabase

Substituído o `types/database.ts` mínimo por um arquivo completo com o tipo `Database` seguindo o padrão do Supabase CLI, incluindo:

- `Row`, `Insert` e `Update` para todas as 12 tabelas
- Enums de string tipados (account type, category type, transaction type, etc.)
- Funções públicas RPC tipadas
- Helpers genéricos `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`

Os tipos foram gerados manualmente a partir do schema em `supabase/migrations/202605100001_initial_schema.sql`. Em um ambiente com Supabase local ativo, o comando equivalente é:

```bash
npx supabase gen types --lang typescript --local > types/database.ts
```

### Testes automatizados

Configurado Vitest com `vitest.config.ts`. Scripts adicionados ao `package.json`:

- `npm test` — executa todos os testes uma vez
- `npm run test:watch` — modo watch para desenvolvimento
- `npm run test:coverage` — relatório de cobertura

Cobertura: **74 testes, 0 falhas**, em 4 arquivos:

- `lib/formatters/currency.test.ts` — formatCurrency (5 casos)
- `lib/formatters/date.test.ts` — formatDateBR, formatMonthBR (5 casos)
- `lib/imports/normalize.test.ts` — normalizeLookup, readCell, parseImportDate, parseImportAmount, parseImportType, inferImportType, duplicateKey (32 casos)
- `lib/validations/finance.test.ts` — accountFormSchema, transactionFormSchema, budgetFormSchema, goalFormSchema (32 casos)

## Regras

- `types/database.ts` deve ser mantido em sincronia com o schema Supabase. Ao aplicar migrations futuras, regerar os tipos.
- Os testes cobrem apenas lógica pura (formatters, parsers, validadores). Testes de queries e actions dependem de banco real ou mocks — fora do escopo desta sprint.
- O `error.tsx` usa `"use client"` obrigatório por contrato do Next.js (error boundaries são componentes client).
- Os security headers não incluem CSP porque o Supabase e Recharts usam inline styles e eval em desenvolvimento; adicionar CSP requer allowlist de origens e é candidato para sprint futura.

## Como testar

```powershell
npm test
npm run lint
npm run build
```

Validação manual recomendada:

- Navegar para qualquer rota privada e confirmar que o skeleton aparece durante o carregamento.
- Forçar um erro (lançar manualmente em um Server Component) e confirmar que o error.tsx renderiza com botão de retry.
- Inspecionar os headers de resposta HTTP e confirmar a presença de `X-Frame-Options`, `X-Content-Type-Options`, etc.
- Confirmar que `types/database.ts` exporta `Tables`, `TablesInsert`, `TablesUpdate`.

## Pendências

- CSP (Content Security Policy) com allowlist de origens para Supabase, Recharts e CDN de fonts.
- Testes de integração para queries e actions críticas.
- Testes E2E do fluxo de auth (login → onboarding → dashboard).
- Troca real entre múltiplos workspaces.
- Restauração automática de backup JSON.
