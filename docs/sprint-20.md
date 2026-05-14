# Sprint 20 — E2E Tests + CI

## Problema

Nenhum teste cobria o fluxo de auth nem os caminhos críticos de ponta a ponta. Com 19 sprints de funcionalidades acumuladas, refactors e novas features podiam quebrar fluxos visíveis sem qualquer sinal nos testes existentes (unitários/integração com mocks).

## Entregues

### Playwright

- `playwright.config.ts` — configuração com dois projetos: `unauthenticated` (testes de login, sem storageState) e `authenticated` (demais testes, com storageState).
- `webServer` integrado: sobe o Next.js automaticamente em dev ou usa servidor existente.
- `CI: true` ativa retries (2x) e reporter `github`.

### Autenticação programática

- `app/api/e2e-auth/route.ts` — rota `POST` bloqueada em produção e protegida por `E2E_SECRET`. Usa Supabase Admin API para criar o usuário de teste, faz signIn com password e injeta os cookies de sessão via `createServerClient` + `setSession`. Retorna `{ ok: true }` com `Set-Cookie` completo.
- `e2e/global-setup.ts` — chama a rota acima via Playwright, salva `storageState` em `e2e/.auth/user.json`. Em seguida, via admin client, garante que o usuário de teste tem workspace, conta e categorias (expense + income) — dados mínimos para todos os testes.

### Testes E2E (13 testes)

- `e2e/login.spec.ts` — redirecionamentos para `/login` quando não autenticado, exibição do botão Google, mensagem de erro por query param.
- `e2e/dashboard.spec.ts` — carregamento do dashboard, KPI cards, navegação lateral, troca de mês.
- `e2e/transactions.spec.ts` — página abre, botão "Nova transação" visível, sheet abre, cria transação de despesa end-to-end.
- `e2e/budgets.spec.ts` — página abre, botão "Novo orçamento" visível, sheet abre, cria orçamento end-to-end.

### GitHub Actions

- `.github/workflows/ci.yml` — dois jobs:
  1. `lint-and-test`: `npm run lint` + `npm test` (unit/integration)
  2. `e2e`: depende do job anterior, faz build do Next.js, instala Chromium (`--with-deps`), executa `playwright test`, faz upload do relatório HTML como artefato (7 dias).
- Roda em push e PR para `main`/`master`. Cancela runs anteriores do mesmo branch.

### Outros ajustes

- `.env.example` — adicionadas variáveis `E2E_SECRET`, `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`.
- `.gitignore` — adicionados `e2e/.auth`, `playwright-report`, `test-results`.
- `eslint.config.mjs` — `e2e/**` adicionado ao `ignores` (o parâmetro `use` do Playwright triggava `react-hooks/rules-of-hooks`).
- `README.md` — badge de CI, seção de testes E2E e tabela de secrets do CI.
- `docs/roadmap.md` — Sprint 20 marcada como concluída, removida de "Próximas sprints".

## Não incluído

- Testes E2E de auth via Google OAuth (não automatizável sem credenciais reais da Google).
- Testes E2E de fluxos de edição e deleção (próximas sprints podem expandir a suite).
- Cobertura de outros módulos (relatórios, assinaturas, metas, importação CSV).
