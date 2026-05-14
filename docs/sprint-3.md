# Sprint 3 - App Shell, Layout e Design System

## Implementado

- App shell autenticado com sidebar desktop, topbar sticky e bottom navigation mobile.
- Navegação principal agrupada por domínio, com item ativo robusto e sem Onboarding no menu do produto.
- Header com workspace atual, seletor de mês por query param `month=yyyy-MM` e menu de usuário com logout.
- Componentes base reutilizáveis:
  - `PageHeader`
  - `MetricCard`
  - `EmptyState`
  - `ConfirmDialog`
  - `LoadingSkeleton`
  - `MonthSelector`
  - `WorkspaceSwitcher`
  - `UserMenu`
  - `DataTable`
- Placeholders específicos para transações, contas, categorias, assinaturas, orçamentos, metas, relatórios, importação e configurações.
- Dashboard visual com KPIs, blocos de gráfico/alertas e estados preparados para dados reais.

## Decisões de UI

- O layout segue o registro `product` do Impeccable: operacional, contido e voltado a uso recorrente.
- O mobile prioriza Dashboard, Transações, Contas e Orçamentos, com o restante no menu "Mais".
- Cards foram usados apenas para KPIs, ferramentas e blocos funcionais. Não há hero marketing no app autenticado.

## Como validar

```bash
npm run lint
npm run build
npm run dev
```

Depois, validar:

- `/login` continua acessível.
- Rotas privadas redirecionam para `/login` sem sessão.
- Usuário autenticado vê sidebar no desktop e bottom nav no mobile.
- Textos aparecem em português correto.
- O seletor de mês atualiza a URL com `?month=yyyy-MM`.

## Pendências

- Ligar as tabelas e formulários aos dados reais nos próximos sprints.
- Adicionar screenshots/responsividade visual com navegador quando o runtime local estiver disponível.
- Evoluir o `WorkspaceSwitcher` para troca real entre múltiplos workspaces.
