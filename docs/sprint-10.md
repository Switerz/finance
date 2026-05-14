# Sprint 10 - Dashboard completo e UI/UX

## Entrega

- Dashboard executivo com KPIs, projeção de fechamento e taxa de poupança documentada.
- Gráficos reais com Recharts:
  - receitas vs despesas;
  - evolução diária de gastos;
  - gastos por categoria;
  - top categorias;
  - fixos vs variáveis;
  - evolução de saldo.
- Alertas financeiros com orçamentos, assinaturas, gasto diário e metas.
- Top transações pagas do mês.
- Tema claro/escuro com `next-themes`, padrão `system` e toggle no topbar.
- Tokens visuais revisados para paleta verde escuro/teal profundo.
- Passe de UI no AppShell, Sidebar, Topbar e MobileNav.

## Regras e fórmulas

- Saldos reais consideram apenas transações `paid`.
- Filtros mensais usam `transaction_date`.
- Saldo do mês: `income - expenses - investments`.
- Taxa de poupança: `(investments + max(balance, 0)) / income`.
- Projeção de fechamento: `expenses_so_far / elapsed_days_in_month * total_days_in_month`.
- Gasto fixo: despesa paga com `recurring_rule_id`, `is_recurring = true` ou tag `assinatura`.
- Gasto variável: demais despesas pagas.

## UI/UX

- Tema escuro evita preto puro e usa superfícies em verde profundo.
- Verde escuro aparece em navegação ativa, foco, ações primárias e séries principais.
- Sem gradientes decorativos, glassmorphism ou excesso de cor.
- Gráficos têm empty states quando não há dados.
- Dashboard foi estruturado para desktop, tablet e mobile.

## Como validar

```powershell
rtk npm run lint
rtk npm run build
```

Validação manual recomendada:

- alternar tema claro/escuro/sistema e recarregar;
- abrir `/dashboard?month=yyyy-MM` com e sem dados;
- conferir KPIs contra transações pagas;
- confirmar que pendentes, agendadas e canceladas não entram nos saldos;
- validar projeção, taxa de poupança e alertas;
- testar responsividade em desktop e mobile;
- verificar contraste e legibilidade nos dois temas.

## Pendências

- Review visual profundo de todas as telas CRUD fica para Sprint 14.
- Testes automatizados de cálculos ainda precisam ser adicionados.
- Relatórios completos continuam para Sprint 11.
