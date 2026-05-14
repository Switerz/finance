# Sprint 11 - Relatórios mensais e exportação CSV

## Entrega

A Sprint 11 transformou `/reports` em uma tela analítica real, baseada no mês global `?month=yyyy-MM`, comparando o mês selecionado contra o mês anterior. Também foi criada a primeira exportação CSV do produto, restrita às transações do workspace atual.

## Implementado

- Tela `/reports` com cards de renda, despesas, investimentos, saldo, taxa de poupança, média diária e projeção de fechamento.
- Comparação mensal com variação absoluta e percentual contra o mês anterior.
- Variação por categoria de despesa.
- Listas compactas de maiores gastos e maiores receitas pagas.
- Gráficos Recharts para evolução mensal de saldo e variação por categoria.
- Análise básica de assinaturas com total mensal equivalente, total anualizado, ativas e dispensáveis.
- Empty states para relatórios sem dados.
- Query `getMonthlyReport(month?)` em `lib/queries/reports.ts`.
- Endpoint `GET /api/export?type=transactions&month=yyyy-MM`.
- Exportação CSV com sessão obrigatória, workspace resolvido no servidor, separador `;` e UTF-8 com BOM.
- Atualização de `README.md` e `docs/roadmap.md`.

## Regras de cálculo

- Métricas financeiras usam `transaction_date`.
- KPIs e análises financeiras consideram apenas transações com `status = paid`.
- Saldo do mês segue a fórmula `income - expenses - investments`.
- Taxa de poupança segue a fórmula `(investments + max(balance, 0)) / income`.
- CSV exporta as transações do mês selecionado com seus respectivos status para auditoria operacional.

## Endpoint CSV

```text
GET /api/export?type=transactions&month=yyyy-MM
```

Comportamento:

- `401` quando não há sessão.
- `404` quando não há workspace atual.
- `400` para tipo ou mês inválido.
- CSV apenas com cabeçalho quando não há transações no mês.
- Nome sugerido: `finance-planner-transacoes-yyyy-MM.csv`.

Colunas:

- data
- descricao
- valor
- tipo
- status
- conta
- categoria
- forma_pagamento
- tags
- observacoes

## Como testar

```powershell
rtk npm run lint
rtk npm run build
```

Validação manual recomendada:

- Abrir `/reports?month=yyyy-MM` com dados.
- Abrir `/reports?month=yyyy-MM` sem dados.
- Conferir KPIs contra `/dashboard` e `/transactions`.
- Confirmar comparação com mês anterior.
- Confirmar variação por categoria.
- Confirmar maiores gastos e maiores receitas.
- Confirmar que pendentes, agendadas e canceladas não entram nos KPIs.
- Exportar CSV e validar colunas, acentos, separador `;` e valores.
- Confirmar que o CSV respeita o mês selecionado.
- Confirmar que usuário sem sessão não exporta.
- Testar responsividade em desktop e mobile.

## Pendências

- Relatórios por intervalo customizado.
- Exportação completa de dados do workspace em `/settings`.
- Testes automatizados para cálculos de relatório e exportação CSV.
- Importação CSV, prevista para a próxima sprint.
