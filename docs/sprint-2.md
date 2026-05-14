# Sprint 2 - Autenticacao, sessao e onboarding

## Entrega

- Login real com Google OAuth via Supabase.
- Callback `/callback` trocando `code` por sessao.
- Proxy de sessao para manter cookies atualizados.
- Protecao de rotas privadas.
- Redirecionamento para `/onboarding` quando o usuario ainda nao tem workspace.
- Onboarding chamando a RPC `create_initial_workspace`.
- Header exibindo workspace atual, moeda e papel do usuario.
- Logout funcional.

## Fluxo

1. Usuario acessa `/login`.
2. Clica em `Entrar com Google`.
3. Supabase retorna para `/callback`.
4. A sessao e salva nos cookies.
5. Se o usuario nao tiver workspace, vai para `/onboarding`.
6. O onboarding cria workspace, membership `owner`, categorias padrao e conta principal via RPC.
7. Usuario entra no `/dashboard`.

## Requisitos no Supabase

Google provider deve estar habilitado em Auth Providers.

Redirect URLs locais:

```text
http://localhost:3000/callback
http://127.0.0.1:3000/callback
```

Google Cloud OAuth redirect URI:

```text
https://rasqpouxqsplolzxrsyl.supabase.co/auth/v1/callback
```

## Validacao

```powershell
npm run lint
npm run build
npm run dev
```

Depois:

- abrir `/login`;
- entrar com Google;
- confirmar retorno para `/onboarding`;
- criar workspace;
- confirmar entrada no `/dashboard`;
- confirmar que logout volta para `/login`.

## Observacoes

- Magic link ficou fora deste sprint; o fluxo implementado e Google OAuth.
- `SUPABASE_SERVICE_ROLE_KEY` nao foi usada no codigo.
- `.env.local` fica ignorado pelo Git e contem apenas URL + publishable key.
