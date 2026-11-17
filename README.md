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

## Produção (Supabase + Vercel)

- Supabase de produção: projeto `ftkzsqpsppyiakchoinb` (`https://ftkzsqpsppyiakchoinb.supabase.co`), já configurado em
  `apps/web/src/environments/environment.ts`.
- Deploy do front na Vercel a partir da raiz do repo, configurado pelo `vercel.json` (sem variáveis de ambiente).

Passo a passo completo (checklist do Supabase, criação do projeto na Vercel, fluxo de migrations, conferência pós-deploy e problemas
comuns): **[`DEPLOY.md`](DEPLOY.md)**.

Resumo:

```bash
cp .env.example .env            # preencha com os dados do projeto (o .env é ignorado pelo git)
npx supabase login
npx supabase link --project-ref ftkzsqpsppyiakchoinb
npm run db:push                 # migrations em produção (o seed.sql não vai)
npm run build:vercel            # confere localmente o mesmo build da Vercel
```
