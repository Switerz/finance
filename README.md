# Finance Planner

[![CI](https://github.com/Switerz/finance-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/Switerz/finance-planner/actions/workflows/ci.yml)

Planner financeiro pessoal/familiar construído com Next.js, TypeScript, Tailwind CSS, shadcn/ui e Supabase.

O objetivo do projeto é oferecer um app web simples, seguro e com qualidade de produto para controlar contas, categorias, transações, orçamentos, recorrências, assinaturas, metas, relatórios, importação CSV e configurações de workspace.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Table
- Recharts
- date-fns
- lucide-react
- next-themes
- Supabase Auth + Postgres + RLS
- Vercel

## Status atual

Implementado:

- Sprint 0: setup inicial do app, Tailwind, shadcn/ui, estrutura base e `.env.example`.
- Sprint 1: schema Supabase, migrations, seed, funções auxiliares, triggers, indexes e RLS.
- Sprint 2: Google Auth, sessão, proteção de rotas e onboarding inicial.
- Sprint 3: app shell, sidebar, topbar, bottom navigation, seletor de mês e componentes base.
- Sprint 4: CRUD real de categorias e contas.
- Sprint 5: CRUD real de transações, saldos derivados e dashboard mensal com dados reais.
- Sprint 6: orçamentos mensais por categoria, cópia do mês anterior e alertas básicos no dashboard.
- Sprint 7: parcelamentos e recorrências com lançamentos agendados.
- Sprint 8: assinaturas com totais ativos, próximas cobranças e geração de transação agendada.
- Sprint 9: metas financeiras com progresso, prazo, contribuição necessária e resumo no dashboard.
- Sprint 10: dashboard executivo com gráficos reais, projeções, alertas e tema claro/escuro.
- Sprint 11: relatórios mensais com comparação contra mês anterior e exportação CSV de transações.
- Sprint 12: importação CSV com upload, mapeamento, preview validado e histórico.
- Sprint 13: settings com perfil, workspace, membros por allowlist, exportação JSON e exclusão de workspace.
- Sprint 14: loading states em todas as rotas, error boundary global, security headers HTTP, tipos completos do Supabase e testes automatizados (74 testes, 0 falhas).
- Sprint 15: transferências entre contas (com desfazer), diagnóstico do mês no dashboard com projeções por categoria, tendência de taxa de poupança e insights financeiros determinísticos.
- Sprint 16: PWA instalável (manifest, service worker, ícones gerados por ImageResponse, página offline, safe area em dispositivos com notch) e suite de testes de integração cobrindo lógica de negócio das queries (152 testes, 0 falhas).
- Sprint 17: testes de integração para as server actions mais críticas (transactions, budgets, goals) com mocks de Supabase e workspace, e Content-Security-Policy restritiva adicionada ao conjunto de headers HTTP (208 testes, 0 falhas).
- Sprint 18: cancelamento de parcelas e recorrências com scope picker (só este / este e os seguintes / todos), dialog de seleção de escopo, e 9 novos testes de integração (217 testes, 0 falhas).
- Sprint 19: multi-workspace real — cookie de workspace ativo, WorkspaceSwitcher com dropdown funcional, ação de criar workspace, convites por link (tabela `invitations`, página `/invite/[token]`, UI no settings com copiar link e cancelar).
- Sprint 20: E2E tests + CI — Playwright com global-setup programático (auth via service role + seed de workspace), 13 testes E2E cobrindo login/redirecionamentos, dashboard, criar transação e criar orçamento; GitHub Actions com jobs separados (lint+unit → e2e) e upload de relatório como artefato.

Observação de roadmap: a Sprint 6 implementada corresponde a "Orçamentos Mensais", que no plano inicial era a Sprint 8. A Sprint 7 recuperou o escopo original de parcelamentos e recorrências.

Veja o roadmap atualizado em `docs/roadmap.md`.

## Módulos reais

- `/login`
- `/onboarding`
- `/dashboard`
- `/transactions`
- `/accounts`
- `/categories`
- `/budgets`
- `/subscriptions`
- `/goals`
- `/reports`
- `/imports`
- `/settings`

## Setup local

1. Instale Node.js 20 ou superior.
2. Instale dependências:

```bash
npm install
```

3. Crie `.env.local` a partir do `.env.example`:

```bash
cp .env.example .env.local
```

4. Configure as variáveis de ambiente:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WORKSPACE_MEMBER_ALLOWLIST=
```

`SUPABASE_SERVICE_ROLE_KEY` deve ser usada apenas em código server-side. Na Sprint 13, ela é usada para resolver `profiles.email` ao adicionar membros por email allowlisted.

`WORKSPACE_MEMBER_ALLOWLIST` aceita emails separados por vírgula, por exemplo:

```env
WORKSPACE_MEMBER_ALLOWLIST=pessoa1@email.com,pessoa2@email.com
```

5. Rode o app:

```bash
npm run dev
```

6. Acesse `http://localhost:3000`.

## Supabase local

Com Docker disponível:

```bash
npx supabase start
npx supabase db reset
```

O schema versionado fica em `supabase/migrations`. O arquivo `supabase/seed.sql` é opcional e não contém dados sensíveis.

## Exportação CSV

A Sprint 11 adicionou exportação mensal de transações:

```text
GET /api/export?type=transactions&month=yyyy-MM
```

O endpoint exige sessão autenticada, resolve o workspace no servidor e retorna CSV em UTF-8 com separador `;`.

## Exportação JSON

A Sprint 13 adicionou exportação completa do workspace:

```text
GET /api/export?type=workspace&format=json
```

O endpoint exige sessão autenticada e exporta apenas dados do workspace atual.

## Importação CSV

A Sprint 12 adicionou importação manual de extratos em `/imports`.

Fluxo:

1. Upload de CSV.
2. Mapeamento de colunas.
3. Preview com erros, avisos e possíveis duplicatas.
4. Confirmação das linhas selecionadas.
5. Criação de transações pagas no workspace atual.

O endpoint `POST /api/imports` exige sessão autenticada, bloqueia viewers e revalida todas as linhas no servidor antes de inserir transações.

## Testes

### Unitários e de integração

```bash
npm test
npm run test:watch
npm run test:coverage
```

217 testes cobrindo formatters, parsers de importação CSV, validações de formulário, helpers de queries (projeções de orçamento, tendência de poupança, insights, alertas, metas, assinaturas), cálculo de saldo de contas e server actions (transactions, budgets, goals) com mock de Supabase, incluindo cancelamento de parcelas e recorrências por escopo.

### E2E com Playwright

Adicione as variáveis no `.env.local`:

```env
E2E_SECRET=qualquer-string-secreta
E2E_TEST_EMAIL=e2e@example.com
E2E_TEST_PASSWORD=senha-segura-para-testes
```

Execute com o servidor já rodando:

```bash
npm run test:e2e
```

Ou com a interface visual do Playwright:

```bash
npm run test:e2e:ui
```

O global-setup cria automaticamente o usuário de teste via Supabase Admin API, cria um workspace e dados mínimos (conta + categorias). Os cookies de sessão são salvos em `e2e/.auth/user.json` (ignorado pelo git).

## Verificação

Use RTK quando estiver rodando comandos pelo Codex CLI:

```powershell
rtk npm run lint
rtk npm run build
```

Estado atual verificado:

- `lint` passa com 2 warnings conhecidos do React Compiler: `components/tables/data-table.tsx` (useReactTable) e `components/forms/transfer-form.tsx` (form.watch).
- `build` passa.

## Deploy na Vercel

1. Crie um projeto na Vercel apontando para este repositório.
2. Configure as variáveis de ambiente do Supabase.
3. Configure `WORKSPACE_MEMBER_ALLOWLIST` se for usar gestão de membros por email.
4. Aplique as migrations no Supabase remoto.
5. Configure a URL de callback do Supabase Auth para o domínio da Vercel.
6. Execute o deploy.

## CI/CD

O workflow `.github/workflows/ci.yml` executa em todo PR e push para `main`:

1. **lint-and-test** — `eslint` + `vitest run`
2. **e2e** — build do Next.js + `playwright test` (apenas Chromium)

Configure os seguintes secrets no repositório GitHub:

| Secret | Descrição |
|--------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (apenas server) |
| `E2E_SECRET` | Segredo compartilhado da rota `/api/e2e-auth` |
| `E2E_TEST_EMAIL` | Email do usuário de teste E2E |
| `E2E_TEST_PASSWORD` | Senha do usuário de teste E2E |

## Pendências técnicas conhecidas

- Envio de email para convites (sprint 19 entregou link manual; email requer integração com SMTP/Resend).
- Evoluir parcelamentos e recorrências com edição em massa de valores (cancelamento por escopo já implementado na Sprint 18).
- Evoluir CSP de `unsafe-inline` para nonces (requer suporte nativo do Next.js ao React Server Components + nonces).
- Evoluir testes de integração para actions restantes (subscriptions, settings, accounts).
