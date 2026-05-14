# Sprint 6 - Orçamentos Mensais

## Nota de roadmap

No prompt inicial, a Sprint 6 era "Parcelamentos e recorrências". Durante o desenvolvimento, a Sprint 6 foi replanejada para "Orçamentos Mensais", antecipando o escopo original da Sprint 8. Parcelamentos e recorrências ficam registrados como a próxima sprint recomendada.

## Implementado

- CRUD real de orçamentos mensais por categoria com Supabase, RLS por workspace e actions server-side.
- Tela `/budgets` com resumo de planejado, realizado, restante e categorias estouradas.
- Tabela com progresso, status visual e ações de editar/remover.
- Filtros por tipo de categoria e status do orçamento.
- Formulário com React Hook Form e Zod para categoria, valor planejado e alerta percentual.
- Cópia idempotente do mês anterior, criando apenas categorias faltantes.
- Dashboard com alertas básicos de orçamento.

## Decisões

- Não há nova migration nesta sprint.
- Orçamentos aceitam categorias ativas de despesa e investimento.
- Realizado considera apenas transações pagas no mês selecionado.
- Remover orçamento usa delete físico e não altera transações.
- `month` é salvo como primeiro dia do mês.
- `alert_threshold` é editável na UI em percentual e salvo como decimal.

## Como testar

```powershell
rtk npm run lint
rtk npm run build
```

Depois, validar manualmente:

- criar orçamento para categoria de despesa;
- criar orçamento para categoria de investimento;
- impedir orçamento duplicado para mesma categoria e mês;
- editar valor planejado e limite de alerta;
- remover orçamento sem remover transações;
- copiar mês anterior preservando orçamentos já existentes;
- criar transações pagas e confirmar realizado/progresso;
- confirmar que pendentes, agendadas e canceladas não contam;
- validar que viewer não cria, edita, copia ou remove.

## Pendências

- Orçamentos de receita.
- Projeção mensal com base no ritmo de gastos.
- Templates de orçamento.
- Relatórios comparativos entre meses.
