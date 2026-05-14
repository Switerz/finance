# Sprint 5 - Transações e Saldos Reais

## Implementado

- CRUD operacional de transações manuais com Supabase, RLS por workspace e actions server-side.
- Tela `/transactions` com filtros por busca, tipo, status, conta e categoria.
- Formulário com React Hook Form e Zod para receitas, despesas e investimentos.
- Ações por linha para editar, duplicar e cancelar transações.
- Cancelamento sem delete físico, usando `status = cancelled`.
- Saldos derivados por conta com base em transações pagas.
- Dashboard mensal alimentado por transações reais.

## Decisões

- Não há nova migration nesta sprint.
- `amount` é salvo sempre positivo.
- `type` define o impacto financeiro:
  - `income` soma;
  - `expense` e `investment` subtraem;
  - `transfer` fica fora do fluxo manual desta sprint.
- Apenas transações com `status = paid` entram no saldo real.
- Transações duplicadas nascem com data de hoje e status `pending`.
- `accounts.current_balance` permanece como coluna legada, mas a UI usa saldo calculado.

## Como testar

```powershell
rtk npm run lint
rtk npm run build
```

Depois, validar manualmente:

- criar receita paga e confirmar aumento do saldo da conta;
- criar despesa paga e confirmar redução do saldo da conta;
- criar investimento pago e confirmar redução do saldo da conta;
- criar transações pendentes/agendadas e confirmar que não alteram saldo;
- cancelar transação e confirmar que ela sai dos saldos e KPIs;
- editar tipo/categoria e validar compatibilidade;
- duplicar transação e confirmar novo registro pendente;
- validar que viewer não persiste mudanças.

## Pendências

- Transferências entre contas.
- Parcelamento e competência.
- Recorrências e assinaturas.
- Tipos gerados completos do Supabase.
