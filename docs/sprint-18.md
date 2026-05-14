# Sprint 18 — Parcelamentos e Recorrências Editáveis

## Objetivo

Permitir ao usuário cancelar parcelas e ocorrências recorrentes individualmente ou em grupo, sem precisar deletar e recriar o conjunto inteiro.

## Entregas

### Actions (`lib/actions/transactions.ts`)

- **`cancelInstallmentGroup(id, groupId, scope)`** — cancela parcelas de um grupo:
  - `"this"` — cancela só a parcela clicada (update por `id`)
  - `"this_and_following"` — busca `installment_number` da parcela atual e cancela todas com número ≥ a esse no mesmo grupo
  - `"all"` — cancela todas as parcelas do grupo independente do número

- **`cancelRecurringGroup(id, ruleId, scope)`** — cancela ocorrências de uma regra recorrente:
  - `"this"` — cancela só a transação clicada (update por `id`)
  - `"this_and_following"` — busca `transaction_date` da transação atual e cancela todas com data ≥ na mesma regra

Ambas usam `.neq("status", "cancelled")` para idempotência e chamam `revalidateTransactionSurfaces()`.

### Componente (`components/transactions/cancel-scope-dialog.tsx`)

Dialog com `RadioGroup` para escolha de escopo. Detecta automaticamente se a transação é parcelamento ou recorrência e exibe as opções adequadas:
- Parcelamento: "Só este", "Este e os seguintes (N)", "Todas as parcelas"
- Recorrência: "Só este", "Este e os próximos"

O escopo reseta para `"this"` ao fechar o dialog.

### Client (`components/transactions/transactions-client.tsx`)

- Transações com `installment_group_id` (excluindo transfers) ou `is_recurring` abrem o `CancelScopeDialog` em vez do `ConfirmDialog` padrão
- `onConfirm` despacha a action correspondente e exibe toast de resultado

## Testes

9 novos testes adicionados em `lib/actions/transactions.test.ts`:

- `cancelInstallmentGroup`: sem workspace, scope "this" happy path, "this_and_following" parcela não encontrada, "this_and_following" happy path, "all" happy path
- `cancelRecurringGroup`: sem workspace, scope "this" happy path, "this_and_following" transação não encontrada, "this_and_following" happy path

`makeChain` helper expandido com `.gte()` para suportar os filtros de range.

## Verificação

- `npm test` — 217 testes, 0 falhas
- `npm run lint` — 0 erros, 2 warnings conhecidos (react-hooks/incompatible-library em data-table.tsx e transfer-form.tsx)
- `npm run build` — 0 erros TypeScript
