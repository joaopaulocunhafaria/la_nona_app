# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

**La Nona** é um app de restaurante (cardápio, carrinho, favoritos, chat de suporte, área administrativa e telemetria de uso) em monorepo
com npm workspaces. O backend é o **Supabase** (BaaS): Postgres + RLS, Auth, Storage, Realtime. Não existe servidor próprio.

| Pasta             | O que é                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `apps/web`        | Front-end **Angular 19.2** (`@lanona/web`): NgModules, PrimeNG 19, Tailwind 4, `@supabase/supabase-js` |
| `packages/shared` | `@lanona/shared`: `database.types.ts` (**gerado**) + aliases de domínio em `models.ts`          |
| `supabase/`       | `config.toml`, `migrations/`, `seed.sql`, `tests/database/` (pgTAP), `functions/` (Deno)         |
| `app/`            | App Flutter **legado**. Ainda fala com a API Spring Boot, que foi removida, então **não funciona** até ser migrado para `supabase_flutter` |

- Node **22** (`nvm use`), npm 10. Não atualize a versão do Angular nem migre para standalone/zoneless sem pedido explícito.
- O Supabase local usa as **portas 553xx** (API 55321, DB 55322, Studio 55323, Mailpit 55324) para não colidir com outros projetos.

## Comandos

```bash
nvm use && npm install
npm run db:start          # Supabase local (Docker); db:status mostra URLs e chaves
npm start                 # http://localhost:4200 (configuração development, Supabase local)
npm run build             # produção  |  npm run build-homolog -w @lanona/web
npm run build:vercel      # build do deploy: falha se environment.ts não apontar para o Supabase de produção
npm run typecheck         # shared + app + e2e
npm run test:ci -w @lanona/web                         # Karma headless (todos)
npm run test:ci -w @lanona/web -- --include src/app/modules/cart   # Karma de uma pasta/arquivo
npm run db:test                                        # pgTAP (todos)
npx supabase test db supabase/tests/database/40_chat.test.sql      # pgTAP de um arquivo
npm run e2e                                            # Playwright (sobe o ng serve na porta 4310 sozinho)
npm run e2e -- e2e/carrinho.spec.ts -g "finalizar"     # E2E de um arquivo / teste
npm run test:tudo         # typecheck + Karma + pgTAP + E2E
npm run db:migration <nome> && npm run db:reset && npm run db:types   # mudança de schema
npm run format            # Prettier (também no pre-commit via husky + lint-staged)
```

O Karma precisa de Chrome. Se não for encontrado, use `CHROME_BIN=/usr/bin/google-chrome`. Os E2E exigem o Supabase local no ar (`db:start`; rode `db:reset` se o schema mudou).

## Arquitetura

### Banco (`supabase/migrations`, uma migration por domínio)

- `profiles` é 1:1 com `auth.users` e é criado pelo trigger `criar_perfil_novo_usuario`. `role` (`cliente|entregador|admin`) é a única
  fonte de autorização. `public.eh_admin()` lê a tabela (não o JWT), então uma promoção de cargo vale na hora, sem novo login.
- **Leitura** acontece por RLS direto nas tabelas. **Escrita com regra de negócio** acontece por RPCs `security definer` que reproduzem as validações e
  mensagens pt-BR do antigo backend: `salvar_endereco`, `salvar_item_cardapio` (item + imagens numa transação), `adicionar_ao_carrinho`
  (upsert somando), `enviar_mensagem_chat` / `marcar_chat_lido`, `admin_buscar_usuarios` / `admin_alterar_cargo`, as RPCs de ingestão
  de telemetria (abertas a `anon`) e as `telemetria_*` (só admin, devolvem `jsonb` já no formato das interfaces do front).
- As tabelas de telemetria não têm grant direto: tudo passa pelas RPCs.
- O total do carrinho é sempre calculado pelo preço **atual** do item (join), nunca por snapshot. Um trigger bloqueia item `INDISPONIVEL`.
- `chat_messages` e `chat_threads` estão na publicação `supabase_realtime`, e o Realtime aplica o RLS a cada assinante.
- Storage: buckets públicos `cardapio` (escrita só admin, caminho `itens/<uuid>.<ext>`) e `fotos-perfil` (escrita só em `<auth.uid()>/`).
  O banco guarda a URL pública, e em `menu_item_images` também o `storage_path`, para remover órfãs.

### Front (`apps/web/src/app`)

- `services/supabase.service.ts` é o cliente tipado único (`SupabaseClient<Database>`). O acesso ao banco acontece **só em serviços**, nunca em componentes.
- `utils/_metodos/supabase.ts`:
  - `deSupabase()` transforma `{data, error}` em um Observable que lança o erro;
  - `dadosOuErro()` faz o mesmo para fluxos async;
  - `mensagemErro()` repassa a mensagem pt-BR das RPCs e traduz 23505/23503;
  - `escaparLike()` é usado em todo `ilike`.
- Os serviços mantêm a API pública em `Observable` e mapeiam as linhas do PostgREST (`snake_case`) para os modelos camelCase das telas. Exemplos:
  `itemDaLinha` + `SELECT_ITEM_CARDAPIO` em `menu-item.service.ts`, reusados por carrinho e favoritos, e `usuarioDoPerfil` em
  `auth.models.ts`.
- Auth:
  - `AuthService` usa Supabase Auth (`signInWithPassword`, `signUp`, `signInWithIdToken` para Google) e expõe os signals `usuario` /
    `isAuthenticated` / `isAdmin`;
  - `provideAppInitializer` aguarda `sessaoPronta()` antes da primeira tela;
  - `AuthGuard` / `AdmGuard` também aguardam;
  - não há interceptor HTTP. O `HttpClient` só existe para APIs externas (ViaCEP).
- `ChatService` mantém um canal Realtime por conversa (`postgres_changes` filtrado por `thread_user_id`) e um canal de conversas para o admin.
  A tela de chat expõe `data-tempo-real="conectado"` quando o canal assinou, e os E2E esperam por esse atributo.
- `TelemetryService` chama as RPCs de ingestão. No `pagehide`/aba oculta usa `fetch(..., { keepalive: true })`, porque o `sendBeacon` não
  envia `apikey`/`Authorization`.
- Imagens são comprimidas no navegador (`utils/_metodos/imagem.ts`) antes do upload.
- Convenções do front (detalhes em `apps/web/PATTERNS.md`):
  - NgModules (`standalone: false`), lazy loading e injeção pelo construtor;
  - estado em signals;
  - models/services locais à feature (`modules/<feature>/_modelos`, `_services`);
  - PrimeNG + Tailwind;
  - UI em pt-BR;
  - Prettier com tabs (largura 3) e `printWidth` 140.

### Ambientes e deploy

- Ambientes, trocados por `fileReplacements`, todos com a forma `{ production, supabaseUrl, supabaseKey, googleClientId }`:
  - `environment.development.ts`: Supabase local, com a anon key demo do CLI;
  - `environment.homolog.ts`: placeholders;
  - `environment.ts`: produção. Usa a URL **base** `https://<ref>.supabase.co`, sem `/rest/v1`, e a chave `sb_publishable_…`.
- Produção: projeto Supabase `ftkzsqpsppyiakchoinb`. `scripts/verificar-ambiente-producao.mjs` roda antes do build da Vercel e barra o
  deploy se `environment.ts` não apontar exatamente para ele (URL base + `sb_publishable_…`). Passo a passo em `DEPLOY.md`.
- Mudança de schema em produção: `npm run db:push` **antes** do merge na `main` (o push na `main` publica o front na Vercel).
- A Vercel lê o `vercel.json` da raiz. Root Directory = raiz do repo, saída `apps/web/dist/la-nona-web/browser`, fallback SPA.
- Nunca coloque a `service_role`/secret key no front. Ela só é usada pelos E2E (local, lida de `supabase status` no `globalSetup`).

## Regras para mudanças

- **Schema** só muda por migration nova (nunca edite uma já aplicada nem o banco remoto à mão). Depois: `db:reset` + `db:types`, e adicione o
  alias em `packages/shared/src/models.ts`. `database.types.ts` é gerado, então não o edite.
- Toda tabela nova em `public`: RLS habilitado, policy explícita, `revoke all` seguido de `grant` mínimo. Toda função: `set search_path = ''`
  (as `security definer` com nomes qualificados). O `00_seguranca.test.sql` verifica isso automaticamente.
- Erros de negócio nas RPCs: `raise exception '<mensagem pt-BR>' using errcode = '22023'`, com `42501` para permissão e `P0002` para não encontrado.
- Primeiro admin: depois de se cadastrar, rode `update public.profiles set role = 'admin' where email = '...';` (local: Studio em
  http://127.0.0.1:55323).
- Testes (rode só os relacionados à mudança e, no fim, `npm run typecheck`):
  - **pgTAP** em `supabase/tests/database/NN_<dominio>.test.sql`: simule o papel com `set local role authenticated` +
    `set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'`, e use `throws_ok` com o código do erro.
  - **Playwright** em `apps/web/e2e/`: importe `test`/`expect` de `./apoio/fixtures`. A fixture `banco` (service role local) cria usuários,
    itens e categorias e apaga tudo no fim, e a fixture automática `semErrosJs` falha o teste quando a página lança um erro JS. Cada teste cria os próprios dados com
    `unico()`/`emailUnico()`.
  - **Karma**: specs ao lado do arquivo. Use `provideSupabaseFalso(dados)` (`src/testing/supabase-falso.ts`) em vez de rede.
- Commits no padrão `tipo(escopo): descrição` (`feat(cardapio): ...`, `fix(chat): ...`).
