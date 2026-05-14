# Roadmap

## Concluído

- Sprint 0 — Setup inicial: Next.js, Tailwind, shadcn/ui, estrutura base e `.env.example`.
- Sprint 1 — Supabase: schema, migrations, seed, triggers, índices e RLS.
- Sprint 2 — Auth: Google OAuth, sessão, proteção de rotas e onboarding.
- Sprint 3 — App shell: sidebar, topbar, bottom navigation, seletor de mês e componentes base.
- Sprint 4 — Categorias e contas: CRUD real com validações.
- Sprint 5 — Transações e saldos: CRUD real, saldos derivados e dashboard mensal com dados reais.
- Sprint 6 — Orçamentos mensais: CRUD por categoria, cópia do mês anterior e alertas básicos.
- Sprint 7 — Parcelamentos e recorrências: lançamentos agendados com geração automática.
- Sprint 8 — Assinaturas: totais ativos, próximas cobranças e geração de transação agendada.
- Sprint 9 — Metas financeiras: progresso, prazo, contribuição necessária e resumo no dashboard.
- Sprint 10 — Dashboard executivo: gráficos reais, projeções, alertas e tema claro/escuro.
- Sprint 11 — Relatórios mensais: comparação com mês anterior e exportação CSV de transações.
- Sprint 12 — Importação CSV: upload, mapeamento, preview validado e histórico.
- Sprint 13 — Settings: perfil, workspace, membros por allowlist, exportação JSON e exclusão.
- Sprint 14 — QA e hardening: loading states, error boundary global, security headers HTTP, tipos completos do Supabase e testes automatizados (74 testes, 0 falhas).
- Sprint 15 — Transferências e insights: transferências entre contas com desfazer, diagnóstico do mês no dashboard com projeções por categoria, tendência de taxa de poupança e insights financeiros determinísticos.
- Sprint 16 — PWA: manifest, service worker, ícones gerados por ImageResponse, página offline, safe area em dispositivos com notch, e suite de testes de integração cobrindo lógica de negócio das queries (152 testes, 0 falhas).
- Sprint 17 — Testes de actions + CSP: testes de integração para transactions, budgets e goals com mocks de Supabase e workspace; Content-Security-Policy restritiva adicionada aos headers HTTP (208 testes, 0 falhas).
- Sprint 18 — Cancelamento por escopo: cancelamento de parcelamentos e recorrências com scope picker ("só este", "este e os seguintes", "todos"), dialog de seleção de escopo e 9 novos testes de integração (217 testes, 0 falhas).
- Sprint 19 — Multi-Workspace: cookie `workspace_id` para workspace ativo, WorkspaceSwitcher com dropdown funcional e dialog de criação, ações `switchWorkspace` e `createWorkspace`, convites por link com tabela `invitations`, página `/invite/[token]` pública e UI de convites no settings.
- Sprint 20 — E2E Tests + CI: Playwright com global-setup programático (auth via service role + seed de workspace/conta/categorias), rota `/api/e2e-auth` (bloqueada em produção), 17 testes E2E (login/redirecionamentos, dashboard, criar transação, criar orçamento), GitHub Actions com jobs `lint-and-test` e `e2e` (upload de relatório como artefato), badge de CI no README.
- Sprint 21 — Optimistic UI + Performance: `useOptimistic` + `useTransition` para `cancelTransaction` e `duplicateTransaction` em `transactions-client.tsx` (feedback imediato sem `router.refresh()` bloqueante); Suspense streaming no dashboard com `KpiSection` e `ChartsSection` como async server components (header renderiza imediatamente, KPIs e gráficos streamam quando a query resolve); `router.prefetch` no hover de cada link da sidebar.
- Sprint 22 — Notificações + Push: Web Push via `PushManager` com VAPID; tabelas `notification_preferences` e `push_subscriptions` com RLS; handlers `push` e `notificationclick` no service worker; UI de preferências em `/settings` com ativação por dispositivo e toggles de alerta (assinaturas vencendo, metas atrasadas, orçamentos estourados); Supabase Edge Function `send-notifications` (Deno + `npm:web-push`) com cron semanal, limpeza automática de subscrições expiradas (410 Gone) e aggregação de múltiplos alertas por workspace.

Desvio histórico registrado: no escopo original, Sprint 6 era "Parcelamentos e Recorrências". Durante o desenvolvimento foi replanejada para "Orçamentos Mensais", antecipando o escopo da Sprint 8 original. Parcelamentos foram recuperados na Sprint 7.

---

## Próximas sprints

## Pendências transversais

- Envio de email para convites de workspace (sprint 19 entregou link manual; email requer SMTP/Resend).
- Evoluir CSP de `unsafe-inline` para nonces após suporte estável do Next.js.
- Validar PWA com Lighthouse: installability, ícones 192×512, cache strategy para páginas autenticadas.
- Evoluir testes de integração para actions restantes (subscriptions, settings, accounts).
- Edição em massa de valores de parcelamentos (cancelamento por escopo já na Sprint 18).
