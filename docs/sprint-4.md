# Sprint 4 - Categorias e Contas

## Implementado

- CRUD real de contas e categorias com Supabase, RLS por workspace e actions server-side.
- Formulários com React Hook Form e Zod.
- Tabelas com TanStack Table, paginação, ordenação e ações por linha.
- Drawers para criar e editar registros.
- Ações de desativar e reativar com confirmação.
- Toasts de sucesso e erro.
- Defaults operacionais:
  - criação da "Conta principal" quando o workspace não possui contas;
  - criação de categorias padrão quando o workspace não possui categorias.

## Decisões

- Não há delete físico nesta sprint. Contas e categorias são desativadas ou reativadas.
- `workspace_id` é resolvido no servidor em todas as mutations.
- `viewer` pode visualizar, mas não cria, edita ou altera status.
- `current_balance` nasce igual ao `initial_balance`; cálculo por transações fica para o Sprint 5.

## Como testar

1. Faça login e acesse `/accounts`.
2. Crie uma conta manualmente e edite seus campos.
3. Crie um cartão de crédito e valide dias de fechamento/vencimento.
4. Desative e reative uma conta.
5. Acesse `/categories`.
6. Crie categorias e subcategorias do mesmo tipo.
7. Desative e reative uma categoria.
8. Em workspace sem dados, use as ações para criar defaults.

Quando `node` e `npm` estiverem disponíveis no PATH:

```bash
npm run lint
npm run build
```

## Pendências

- Gerar tipos completos do Supabase futuramente para substituir os tipos locais.
- Ligar saldos reais às transações no Sprint 5.
- Evoluir filtros e busca textual nas tabelas quando houver maior volume de dados.
