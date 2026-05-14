# Sprint 8 - Assinaturas

## Implementado

- Tela real de `/subscriptions` com CRUD operacional de assinaturas.
- Resumo com total mensal ativo, total anualizado, assinaturas ativas e dispensáveis.
- Tabela com ciclo, próxima cobrança, status, essencialidade, conta/categoria e ações.
- Filtros por busca textual, status, essencialidade e ciclo.
- Formulário com React Hook Form e Zod.
- Cálculo automático de próxima cobrança para ciclos mensal e trimestral.
- Ciclo anual com próxima cobrança informada pelo usuário e avanço anual após geração.
- Ação para gerar transação agendada a partir de assinatura ativa.
- Proteção contra geração duplicada da mesma cobrança.
- Dashboard com total mensal ativo de assinaturas e próximas cobranças em até 7 dias.

## Decisões

- Não há migration nesta sprint.
- Assinaturas são tratadas como despesas.
- Assinaturas pausadas e canceladas ficam fora dos totais ativos.
- Assinaturas canceladas permanecem no histórico.
- Gerar cobrança cria transação `scheduled`, sem impactar saldo real.
- Remover assinatura não remove transações já geradas.
- Integração automática com `recurring_rules` fica fora desta sprint.

## Como testar

```powershell
rtk npm run lint
rtk npm run build
```

Depois, validar manualmente:

- criar assinatura mensal e confirmar próxima cobrança calculada;
- criar assinatura trimestral e confirmar avanço de 3 meses ao gerar cobrança;
- criar assinatura anual informando próxima data e confirmar avanço de 1 ano;
- editar valor, ciclo, status, conta, categoria e essencialidade;
- pausar assinatura e confirmar que sai dos totais ativos;
- cancelar assinatura e confirmar que fica no histórico;
- gerar transação agendada a partir de assinatura ativa;
- tentar gerar a mesma cobrança novamente e confirmar que não duplica;
- validar que viewer não cria, edita, remove nem gera cobrança;
- confirmar dashboard com total mensal ativo e próximas cobranças em 7 dias.

## Pendências

- Associação automática entre assinatura e recorrência.
- Histórico específico de cobranças por assinatura.
- Recomendações de corte ou revisão de planos.
- Alertas avançados de vencimento no dashboard.
