# La Nona

App de restaurante (cardápio, carrinho, favoritos, chat de suporte, área administrativa e telemetria) com **Angular 19.2 + PrimeNG 19 +
Tailwind 4** no front e **Supabase** como backend (Postgres + RLS, Auth, Storage e Realtime), em monorepo com npm workspaces.

Convenções de arquitetura e de código: veja [`CLAUDE.md`](CLAUDE.md).

## Estrutura

```
.
├── apps/
│   └── web/                      # Front-end Angular (@lanona/web)
│       ├── e2e/                  # Testes Playwright (ponta a ponta contra o Supabase local)
│       └── src/
│           ├── app/              # modules/ por domínio, services/ globais (SupabaseService, AuthService…), utils/
│           ├── environments/     # development (local), homolog, produção
│           └── testing/          # Supabase falso para os testes Karma
├── packages/
│   └── shared/                   # @lanona/shared: tipos do banco (GERADO) + aliases de domínio
├── supabase/
│   ├── config.toml               # Supabase local (portas 553xx)
│   ├── migrations/               # Schema versionado: tabelas, RLS, RPCs, buckets
│   ├── seed.sql                  # Dados de dev (só no db:reset local)
│   ├── tests/database/           # Testes pgTAP
│   └── functions/                # Edge Functions (Deno), nenhuma em uso por enquanto
├── scripts/verificar-ambiente-producao.mjs
├── vercel.json
└── app/                          # App Flutter legado (sem backend até ser migrado para o Supabase)
```

## Pré-requisitos

- Node **22** (`nvm use`, veja `.nvmrc`)
- Docker (para o Supabase local)

## Primeiros passos

```bash
nvm use
npm install
npm run db:start        # sobe Postgres, Auth, Storage, Realtime e Studio (1ª vez baixa as imagens)
npm start               # http://localhost:4200
```

- Studio local: http://127.0.0.1:55323. E-mails do Auth local: http://127.0.0.1:55324 (Mailpit).
- O cadastro não exige confirmação de e-mail.
- Para virar administrador, cadastre-se pela tela e rode no Studio (SQL Editor):

  ```sql
  update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
  ```

  O cargo vale na hora; basta recarregar a página.

## Scripts

| Script                         | O que faz                                                    |
| ------------------------------ | ------------------------------------------------------------ |
| `npm start`                    | Dev server do Angular (Supabase local)                       |
| `npm run build`                | Build de produção (`apps/web/dist`)                          |
| `npm run build:vercel`         | Build do deploy (valida o environment de produção antes)     |
| `npm run typecheck`            | Checagem de tipos (shared, app e E2E)                        |
| `npm run test:ci -w @lanona/web` | Testes Karma headless                                      |
| `npm run db:test`              | Testes pgTAP das regras do banco                             |
| `npm run e2e`                  | Testes Playwright ponta a ponta                              |
| `npm run test:tudo`            | Typecheck + Karma + pgTAP + E2E                              |
| `npm run format`               | Prettier no repo inteiro                                     |
| `npm run db:start` / `db:stop` | Sobe/derruba o Supabase local                                |
| `npm run db:status`            | Mostra URLs e chaves locais                                  |
| `npm run db:reset`             | Recria o banco local: migrations + seed                      |
| `npm run db:migration <nome>`  | Cria uma migration vazia                                     |
| `npm run db:diff <nome>`       | Gera migration a partir de mudanças feitas no Studio         |
| `npm run db:types`             | Regenera `packages/shared/src/database.types.ts`             |
| `npm run db:push`              | Aplica as migrations no projeto remoto                       |
| `npm run functions:serve`      | Roda as Edge Functions localmente                            |
| `npm run functions:deploy`     | Publica as Edge Functions                                    |

## Fluxo de mudança no banco

1. `npm run db:migration add_algo` e escreva o SQL (sempre com **RLS**, policies e grants mínimos).
2. `npm run db:reset` para aplicar localmente.
3. `npm run db:types` para atualizar os tipos.
4. Adicione aliases em `packages/shared/src/models.ts` e use no front com `import type { … } from '@lanona/shared'`.
5. Escreva/atualize o teste pgTAP do domínio e rode `npm run db:test`.

## Projeto remoto (Supabase Cloud)

O projeto de produção **ainda não foi criado**. Quando for:

```bash
cp .env.example .env            # preencha; .env é ignorado pelo git
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npm run db:push                 # aplica as migrations (as categorias padrão vêm da migration; o seed.sql não vai para produção)
npm run db:types:remote
```

Depois:

1. Preencha `apps/web/src/environments/environment.ts` com a URL **base** (`https://<PROJECT_REF>.supabase.co`, sem `/rest/v1`) e a
   **publishable key** (`sb_publishable_…`). **Nunca** use a `service_role`/secret key no front-end.
2. Troque `PROJECT_REF_PRODUCAO = 'PREENCHER'` em `scripts/verificar-ambiente-producao.mjs` pelo mesmo project ref.
3. No painel do Supabase: em Authentication > Sign In / Providers, desative "Confirm email" (mesmo comportamento do ambiente local) e cadastre a
   URL da Vercel em Authentication > URL Configuration.
4. (Opcional) Login com Google: ative o provider Google no Supabase com o Client ID OAuth e preencha `googleClientId` nos environments.

## Deploy (Vercel)

O deploy usa o `vercel.json` da raiz e **sempre aponta para o Supabase de produção**, inclusive nos preview deployments. O comando de build
é `npm run build:vercel`, que roda `scripts/verificar-ambiente-producao.mjs` antes do `ng build`. O deploy falha enquanto o environment
de produção não estiver preenchido.

1. **Vercel**: _Add New… → Project_ → importe o repositório.
   - **Root Directory**: a raiz do repo (não `apps/web`: o build precisa dos workspaces e do `@lanona/shared`).
   - Framework, install, build e output vêm do `vercel.json`. Não sobrescreva no painel. Nenhuma variável de ambiente é necessária: a
     publishable key é pública por design e a segurança vem do RLS.
   - Node 22 é lido de `engines` no `package.json`.
2. Cada push na `main` gera um deploy de produção; outras branches geram previews (também com o banco de produção).

Para checar localmente: `npm run build:vercel`.
