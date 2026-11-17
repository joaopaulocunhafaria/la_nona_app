# DEVELOPMENT.md

Documentação central do monorepo **La Nona**: estado atual de cada subprojeto e onde está a documentação detalhada. As regras de
arquitetura e código ficam no [`CLAUDE.md`](./CLAUDE.md); setup e scripts no [`README.md`](./README.md); deploy no [`DEPLOY.md`](./DEPLOY.md).

---

## 1. Visão geral

```
la_nona/
├── apps/web/         Front-end Angular 19.2: o app em uso, com o Supabase como backend
├── packages/shared/  Tipos gerados do banco + aliases de domínio (@lanona/shared)
├── supabase/         Schema (migrations), RLS, RPCs, buckets, seed e testes pgTAP
└── app/              App Flutter legado (sem backend: ver seção 3)
```

## 2. Histórico da migração

1. Começou como um app Flutter falando direto com o Firebase.
2. Ganhou uma API **Spring Boot + PostgreSQL** (JWT próprio, STOMP para o chat, S3 para imagens) e um front **Angular** consumindo essa API.
3. **Agora:** o Spring Boot foi **removido** e todas as funcionalidades do web foram migradas para o **Supabase** como BaaS:

| Antes (Spring Boot)                              | Agora (Supabase)                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| JWT + refresh token próprios, BCrypt              | Supabase Auth (e-mail/senha; Google via `signInWithIdToken`)                     |
| Tabela `users` (schema `la_nona_api`)             | `public.profiles` 1:1 com `auth.users`, criado por trigger                       |
| `@PreAuthorize("hasRole('ADMIN')")`               | RLS + `public.eh_admin()` (lê `profiles.role`, vale sem novo login)              |
| Regras nos `services` Java                        | RPCs `security definer` com as mesmas validações e mensagens pt-BR               |
| STOMP/SockJS (`/ws`)                              | Supabase Realtime (`postgres_changes` em `chat_messages`/`chat_threads`)         |
| Upload base64 → S3                                | Upload direto do navegador para os buckets `cardapio` e `fotos-perfil`           |
| Queries nativas de telemetria                     | RPCs `telemetria_*` (admin) e RPCs de ingestão (anon/logado)                     |
| Flyway + Testcontainers + Mockito                 | Migrations Supabase + pgTAP + Playwright E2E + Karma com Supabase falso          |

A produção nasce vazia (sem migração de dados do Postgres do Render nem do S3). As categorias padrão do cardápio vêm da migration.

## 3. App Flutter (`app/`)

O app Flutter consumia a API Spring Boot (`lib/data/api/api_client.dart`, STOMP em `/ws`). Com a remoção do backend ele **não funciona
mais**. O próximo passo para ele é trocar os services Dart por `supabase_flutter`, reaproveitando o mesmo schema, RLS e RPCs que o web já
usa. A documentação antiga do Flutter (`app/CLAUDE.md`, `app/GEMINI.md`, `app/MODELS.md`, `app/CHAT.md`) descreve a época do Firebase e
serve só como referência histórica.

## 4. Pendências

1. **Deploy**: o projeto Supabase de produção (`ftkzsqpsppyiakchoinb`) já tem o schema e o front aponta para ele. Falta criar o projeto
   na Vercel e ajustar Auth (confirmação de e-mail, Site URL) no painel do Supabase, como descrito em [`DEPLOY.md`](./DEPLOY.md).
2. **App Flutter**: migrar para `supabase_flutter` (seção 3).
3. **Pedido/Checkout**: ainda não existe. "Finalizar Pedido" envia o resumo do carrinho no chat de suporte e esvazia o carrinho.
