# Sprint 15 - Transferências entre contas + Diagnóstico do mês

## Entrega

A Sprint 15 fecha o gap mais relevante de produto (transferências entre contas) e adiciona inteligência determinística ao dashboard com projeções por categoria e insights financeiros do mês.

## Feature 1 — Transferências entre contas

### Como funciona

Cada transferência cria dois `Transaction` linkados pelo `installment_group_id`:

- `installment_number = 1` → saída da conta de origem (impacto negativo no saldo)
- `installment_number = 2` → entrada na conta de destino (impacto positivo no saldo)
- `type = "transfer"`, `status = "paid"`, `category_id = null`, `installment_total = 2`

Nenhuma migration de banco foi necessária — o schema já suportava este padrão.

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `lib/queries/accounts.ts` | `transactionImpact` recebe `installmentNumber`; transfers retornam `±amount` conforme o lado |
| `lib/queries/transactions.ts` | Mesma correção; `transfer_peer_name` via mapa two-pass; novos helpers de insights |
| `lib/actions/transactions.ts` | `createTransfer` + `deleteTransfer` |
| `lib/validations/finance.ts` | `transferFormSchema` com refinement `from !== to` |
| `types/finance.ts` | `Transaction.transfer_peer_name`; tipos `BudgetProjection`, `SavingsRateTrend`, `FinancialInsight` adicionados a `DashboardSummary` |
| `components/forms/transfer-form.tsx` | **NOVO** — form com react-hook-form + transferFormSchema |
| `components/transactions/transactions-client.tsx` | Botão "Transferir"; sheet mode `"transfer"`; exibição de peer name; ação "Desfazer" por `installment_group_id` |

### Exibição na tabela

Transferências aparecem nos dois lados com descrição enriquecida:
- `→ Conta destino` para o lado de saída
- `← Conta origem` para o lado de entrada

A ação "Desfazer" remove os dois registros atomicamente via `deleteTransfer(groupId)`.

---

## Feature 2 — Diagnóstico do mês no dashboard

### Novos tipos

```typescript
BudgetProjection   // projeção de ritmo por categoria de orçamento
SavingsRateTrend   // tendência da taxa de poupança vs 3 meses anteriores
FinancialInsight   // insight textual com severidade e link opcional
```

Todos adicionados a `DashboardSummary`. `SubscriptionSummary` ganhou `dispensableMonthlyTotal`.

### Lógica de projeção

- `projected = (actual / elapsedDays) * totalDays` por categoria de orçamento
- `elapsedDays = Math.max(1, dayOfMonth)` para evitar divisão por zero no dia 1
- `willExceed = projected > planned`

### Savings rate trend

- Compara o mês atual com a média dos 3 meses anteriores no `monthlySeries`
- `"up"` se diff > 2 p.p., `"down"` se < -2 p.p., `"stable"` caso contrário

### Insights gerados (máx 5)

1. Orçamentos que vão estourar (até 2, ordenados por desvio)
2. Tendência de taxa de poupança (quando não estável)
3. Assinaturas dispensáveis ativas
4. Meta com prazo próximo ou vencido
5. Despesas projetadas acima de 90% da renda

### Componente InsightsPanel

`components/dashboard/insights-panel.tsx` — Card "Diagnóstico do mês" com:
- Linha de taxa de poupança com seta direcional
- Barras de progresso das categorias em risco
- Lista de insights com ícone por severidade e links

O card só é renderizado quando há dados relevantes (`null` caso contrário).

---

## Verificação

```
npm test     → 74 passed (74)
npm run lint → 0 errors, 2 warnings (pré-existentes)
npm run build → ✓ Compiled, 0 type errors
```
