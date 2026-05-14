# Sprint 7 - Parcelamentos e Recorrências

## Implementado

- Criação de compras parceladas a partir de valor total, primeira data e quantidade de parcelas.
- Geração de parcelas mensais com `installment_group_id`, `installment_number` e `installment_total`.
- Parcelas nascem com `status = scheduled` e não impactam saldos até serem pagas.
- Aba de recorrências dentro de `/transactions`.
- CRUD básico de `recurring_rules` com criar, editar, pausar, reativar, remover e gerar lançamentos.
- Geração idempotente das próximas 12 ocorrências recorrentes como transações `scheduled`.
- Tabela de transações exibe o marcador de parcela `n/total`.
- Edição de uma transação gerada preserva seus vínculos de parcela ou recorrência.

## Decisões

- Não há migration nesta sprint.
- Frequências disponíveis na UI: mensal, trimestral e anual.
- Frequências diária e semanal permanecem fora da UI.
- Recorrências geram lançamentos agendados, não pagos.
- Remover uma recorrência apaga apenas a regra e preserva transações já geradas.
- Geração recorrente não sobrescreve lançamentos existentes para a mesma regra e data.
- Parcelamentos avançam mês a mês e ajustam datas para o último dia válido do mês.
- Arredondamento de parcelas usa centavos e ajusta a diferença na última parcela.

## Como testar

```powershell
rtk npm run lint
rtk npm run build
```

Depois, validar manualmente:

- criar compra parcelada de despesa em 3 parcelas e confirmar 3 transações agendadas;
- confirmar `installment_group_id`, `installment_number` e `installment_total`;
- confirmar exibição `1/3`, `2/3`, `3/3` na tabela;
- confirmar arredondamento correto quando o total não divide igualmente;
- marcar uma parcela como paga e confirmar impacto no saldo apenas naquele mês;
- cancelar uma parcela e confirmar que sai dos KPIs/saldos;
- criar recorrência mensal e confirmar geração de lançamentos agendados;
- gerar novamente e confirmar que não duplica datas já existentes;
- editar, pausar, reativar e remover uma recorrência sem apagar histórico;
- validar que viewer não cria parcelas nem recorrências;
- validar `/transactions?month=yyyy-MM` para meses com parcelas futuras.

## Pendências

- Transferências entre contas.
- Frequências diária e semanal na UI.
- Edição em massa de séries recorrentes ou grupos parcelados.
- Cancelamento em massa de parcelas futuras.
- Associação direta entre assinaturas e recorrências.
