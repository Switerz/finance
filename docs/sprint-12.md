# Sprint 12 - Importação CSV

## Entrega

A Sprint 12 transformou `/imports` em um fluxo real de importação manual de extratos CSV. O usuário carrega um arquivo, mapeia colunas, revisa um preview validado e confirma quais linhas serão gravadas como transações pagas no workspace atual.

## Implementado

- Tela `/imports` com upload, mapeamento, preview, seleção de linhas e histórico.
- Parser client-side com `papaparse`.
- Validação server-side compartilhada entre preview e commit.
- Endpoint `POST /api/imports`.
- Query `getImports()` para histórico.
- Query `getImportFormOptions()` para contas e categorias ativas.
- Server action `previewImportRows(input)`.
- Server action `commitImport(input)`, disponível para uso futuro.
- Registro na tabela `imports`.
- Criação de transações importadas com `status = paid`.
- Detecção de possíveis duplicatas por data, descrição, valor, tipo e conta.
- Correção de mojibake em labels financeiros compartilhados.

## Regras

- Sem migration.
- Sem Supabase Storage.
- Sem `service_role`.
- `workspace_id` é sempre resolvido no servidor.
- Viewer não importa.
- Valores são salvos positivos.
- Tipo mapeado tem prioridade.
- Sem tipo mapeado, o tipo padrão é usado quando informado.
- Com tipo padrão `auto`, valor negativo vira despesa e valor positivo vira receita.
- Investimento exige tipo mapeado ou tipo padrão `investment`.
- Conta mapeada por nome usa conta ativa do workspace; se não encontrar, usa conta padrão.
- Categoria mapeada por nome precisa ser ativa e compatível com o tipo; se não encontrar, usa categoria padrão do tipo.
- Linhas sem data, descrição, valor, conta ou categoria resolvida ficam inválidas.
- Duplicatas suspeitas geram aviso, mas não bloqueiam a importação.

## Endpoint

```text
POST /api/imports
```

Resposta:

```ts
{
  ok: boolean;
  message?: string;
  importId?: string;
  processedRows?: number;
  failedRows?: number;
  fieldErrors?: Record<string, string[]>;
}
```

## Como testar

```powershell
rtk npm run lint
rtk npm run build
```

Validação manual recomendada:

- Abrir `/imports` sem dados e ver o empty state.
- Importar CSV com `;` e com `,`.
- Importar CSV com acentos.
- Mapear data, descrição e valor.
- Usar conta padrão quando não houver coluna de conta.
- Mapear categoria por nome.
- Usar categoria padrão quando categoria vier vazia.
- Validar erro quando categoria não existir e não houver padrão.
- Validar valor negativo como despesa e positivo como receita.
- Validar investimento quando tipo vier mapeado.
- Confirmar que `amount` salvo no banco é positivo.
- Confirmar preview antes de gravar.
- Desmarcar linha duplicada e importar o restante.
- Confirmar registro em `imports`.
- Confirmar transações importadas em `/transactions`.
- Confirmar dashboard, accounts e reports atualizados por transações `paid`.
- Confirmar que viewer não importa.
- Confirmar que usuário sem sessão não usa endpoint.
- Testar responsividade em desktop e mobile.

## Pendências

- Importação por bancos específicos.
- Regras salvas de mapeamento.
- Criação assistida de categorias durante a importação.
- Deduplicação automática configurável.
- Upload persistido em Supabase Storage.
