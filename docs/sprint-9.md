# Sprint 9 - Metas financeiras

## Entrega

- `/goals` deixou de ser placeholder e agora lista metas reais do workspace.
- Tela com cards de resumo: alvo ativo, valor atual, restante e metas ativas.
- Tabela com progresso, prazo, contribuição mensal necessária, status e ações.
- Filtros por busca textual e status.
- Sheet de criação/edição com React Hook Form + Zod.
- Ações server-side para criar, editar, atualizar progresso, concluir e cancelar metas.
- Dashboard atualizado com metas ativas, restante em metas e próxima meta com prazo.

## Regras implementadas

- Sem nova migration.
- `workspace_id` é sempre resolvido no servidor.
- `viewer` só visualiza.
- Valores são positivos.
- `target_amount` deve ser maior que zero.
- `current_amount` não pode ser negativo nem maior que o alvo.
- Metas concluídas igualam o valor atual ao alvo.
- Cancelamento é lógico, usando `status = cancelled`.
- Cards de resumo consideram apenas metas ativas.

## Cálculos

- Progresso: `current_amount / target_amount`.
- Restante: `max(target_amount - current_amount, 0)`.
- Meses restantes: meses de calendário até o prazo.
- Contribuição mensal necessária: `restante / meses restantes`.
- Status visual do prazo: sem prazo, em dia, atenção, vencida ou concluída.

## Como validar

```powershell
rtk npm run lint
rtk npm run build
```

Validação manual recomendada:

- criar meta sem prazo;
- criar meta com prazo futuro;
- editar alvo, valor atual, prazo e contribuição mensal;
- concluir meta e confirmar saída dos totais ativos;
- cancelar meta e confirmar preservação no histórico;
- pausar meta pelo formulário e confirmar que não entra nos totais ativos;
- validar dashboard com metas ativas e restante total;
- confirmar que viewer não cria, edita, conclui nem cancela.

## Pendências

- Integração automática de metas com transações/investimentos fica fora desta sprint.
- Relatórios e gráficos completos continuam para as próximas sprints.
- Testes automatizados ainda precisam ser adicionados.
