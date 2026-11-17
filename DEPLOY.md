# Deploy: Vercel + Supabase

Guia completo para publicar o La Nona. O front (Angular) é servido pela **Vercel**. O backend é o projeto **Supabase de produção**
`ftkzsqpsppyiakchoinb` (`https://ftkzsqpsppyiakchoinb.supabase.co`).

> Todo deploy, inclusive os **previews** de branches e PRs, usa o banco de **produção**. Não teste dados destrutivos num preview.

---

## 1. Visão geral

```
GitHub (main) ──push──▶ Vercel ──npm ci──▶ npm run build:vercel ──▶ apps/web/dist/la-nona-web/browser (site estático)
                                              │
                                              ├─ scripts/verificar-ambiente-producao.mjs  (barra o build se o environment estiver errado)
                                              └─ ng build --configuration production

Navegador ──supabase-js (URL + publishable key)──▶ Supabase de produção (Auth, Postgres/RLS, Storage, Realtime)
```

- Não há servidor nem variáveis de ambiente na Vercel. A URL e a **publishable key** ficam em
  `apps/web/src/environments/environment.ts`. Elas são públicas por design: a segurança vem das policies de RLS e das funções do banco.
- A configuração da Vercel inteira está no `vercel.json` da raiz:

| Campo             | Valor                                  | Por quê                                                        |
| ----------------- | -------------------------------------- | -------------------------------------------------------------- |
| `framework`       | `null` (Other)                         | Evita que a Vercel aplique um preset que ignore os workspaces  |
| `installCommand`  | `npm ci`                               | Instala exatamente o `package-lock.json` da raiz (workspaces)  |
| `buildCommand`    | `npm run build:vercel`                 | Verifica o environment de produção e roda o `ng build`         |
| `outputDirectory` | `apps/web/dist/la-nona-web/browser`    | Saída do builder `application` do Angular                      |
| `rewrites`        | `/(.*)` → `/index.html`                | Fallback de SPA: recarregar `/menu`, `/cart` etc. não dá 404    |
| `headers`         | cache imutável em js/css/fontes/svg, `no-cache` no `index.html`, `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` | Cache e segurança |

---

## 2. Checklist do Supabase de produção (antes do primeiro deploy)

Painel: https://supabase.com/dashboard/project/ftkzsqpsppyiakchoinb

### 2.1 Schema (migrations)

As migrations de `supabase/migrations` precisam estar aplicadas. Na raiz do repo, com o `.env` preenchido (veja `.env.example`):

```bash
npx supabase login                      # ou SUPABASE_ACCESS_TOKEN no .env (token da conta DONA do projeto)
npx supabase link --project-ref ftkzsqpsppyiakchoinb
npm run db:push                         # aplica as migrations pendentes (o seed.sql NÃO vai para produção)
npm run db:types:remote                 # opcional: confere que os tipos batem
```

Para conferir sem o CLI, abra no navegador
`https://ftkzsqpsppyiakchoinb.supabase.co/rest/v1/menu_categories?select=name&apikey=<publishable key>`. Ele deve listar as 7 categorias
padrão (Acompanhamento, Bebida, Hamburguer, Outro, Pizza, Salada, Sobremesa).

> Se o `link` responder "Your account does not have the necessary privileges", o access token é de outra conta. Gere o token em
> **Account → Access Tokens** logado na conta dona do projeto.

### 2.2 Authentication

| Onde (painel)                                         | Configuração                                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Authentication → Sign In / Providers → Email          | **Confirm email: desligado** (o app espera entrar logado logo após o cadastro, como no local)  |
| Authentication → Sign In / Providers → Email          | Minimum password length: **8** (mesma regra do formulário)                                     |
| Authentication → URL Configuration → Site URL         | URL de produção da Vercel, ex.: `https://la-nona.vercel.app` (ou o domínio próprio)            |
| Authentication → URL Configuration → Redirect URLs    | A mesma URL e, para previews, `https://*-<seu-time>.vercel.app/**`                              |

Se a confirmação de e-mail ficar ligada, o cadastro mostra "Confirme seu e-mail para concluir o cadastro." e o usuário só entra depois de
clicar no link do e-mail (que volta para a Site URL).

### 2.3 Login com Google (opcional)

1. Crie um OAuth Client ID (tipo **Web**) no Google Cloud Console. Em "Authorized JavaScript origins", inclua a URL da Vercel.
2. Em Authentication → Sign In / Providers → **Google**, ative o provider e informe o Client ID e o Secret.
3. Preencha `googleClientId` em `apps/web/src/environments/environment.ts` e faça commit. Com o campo vazio, o botão do Google não aparece.

### 2.4 Storage e Realtime

Nada a fazer: os buckets `cardapio` e `fotos-perfil` e a publicação Realtime das tabelas do chat são criados pelas migrations.

### 2.5 Senhas e chaves

- **Nunca** use a `service_role`/secret key no front. O script de verificação recusa chaves `sb_secret_`/`service_role`.
- A senha do banco e o access token ficam só no `.env` local, que é ignorado pelo git. O `.env.example` tem apenas placeholders.
- Se a senha do banco vazar, troque em Project Settings → Database → Reset database password e atualize o `.env`.

---

## 3. Criar o projeto na Vercel

1. Em https://vercel.com: **Add New… → Project → Import Git Repository** → `joaopaulocunhafaria/la_nona_app` (autorize o GitHub se pedir).
2. Na tela de configuração:

| Campo                    | Valor                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Project Name             | `la-nona` (define a URL `la-nona.vercel.app`, se estiver livre)                              |
| Framework Preset         | **Other** (o `vercel.json` já define `framework: null`)                                      |
| Root Directory           | **`./` (raiz do repo)**. **Não** use `apps/web`: o build precisa dos workspaces e do `@lanona/shared` |
| Build / Output / Install | Deixe os padrões. O `vercel.json` sobrescreve (não preencha "Override" no painel)            |
| Environment Variables    | **Nenhuma**                                                                                  |

3. Clique em **Deploy**. O primeiro build leva de 1 a 3 minutos. No log, procure:
   ```
   ✔ Ambiente de produção ok: https://ftkzsqpsppyiakchoinb.supabase.co
   Application bundle generation complete.
   ```
4. Em **Settings → General → Node.js Version**, confirme **22.x**. O `engines` do `package.json` (`>=22 <23`) já pede essa versão. O
   Angular 19 não suporta Node 24.
5. Volte ao Supabase (seção 2.2) e cadastre a URL final em Site URL / Redirect URLs.

### Pelo CLI (alternativa)

```bash
npm i -g vercel
vercel login
vercel link          # na raiz do repo, escolha/crie o projeto
vercel               # deploy de preview
vercel --prod        # deploy de produção
```

---

## 4. Fluxo do dia a dia

- **Push na `main`** gera um deploy de produção. **Outras branches/PRs** geram previews, também com o banco de produção.
- **Mudança de schema:** crie a migration (`npm run db:migration <nome>`), teste localmente (`db:reset`, `db:test`, `e2e`) e rode
  **`npm run db:push` antes** de dar merge na `main`. Assim o front novo nunca chega antes do banco que ele usa. Migrations devem ser
  compatíveis com o front anterior durante a janela entre os dois passos (adicionar colunas/funções primeiro, remover depois).
- **Rollback do front:** em Vercel → Deployments, escolha um deploy anterior → **Promote to Production**. Rollback de banco é sempre
  uma nova migration.
- **Domínio próprio:** em Vercel → Settings → Domains. Depois, atualize Site URL / Redirect URLs no Supabase e, se usar Google, as
  origens autorizadas do OAuth.

---

## 5. Conferência após o deploy

1. Abra a URL: o splash leva para `/home`.
2. Recarregue em `/menu` e em `/menu/<id>`: não pode dar 404 (fallback de SPA).
3. Cadastre-se: o modal de endereço deve abrir. Salve o endereço.
4. Promova-se a admin no **SQL Editor** do Supabase:
   ```sql
   update public.profiles set role = 'admin' where email = 'seu-email@exemplo.com';
   ```
   Recarregue a página: os atalhos Gestão de Usuários, Telemetria e Configurações aparecem (não precisa sair e entrar).
5. Cadastre um item com foto (o upload vai para o bucket `cardapio`), adicione ao carrinho e finalize o pedido. A mensagem deve chegar ao
   chat. Abra `/chat/admin` em outra janela para conferir o tempo real.
6. No painel da Vercel, a aba **Logs/Runtime** não deve mostrar erros (o site é estático; erros de dados aparecem no console do navegador).

---

## 6. Problemas comuns

| Sintoma                                                         | Causa / solução                                                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Build falha com `✖ Ambiente de produção inválido`               | `environment.ts` diferente do esperado. A URL deve ser exatamente `https://ftkzsqpsppyiakchoinb.supabase.co` (sem `/rest/v1`) e a chave `sb_publishable_…`. Se mudar de projeto, troque também `PROJECT_REF_PRODUCAO` em `scripts/verificar-ambiente-producao.mjs` |
| `npm ci` falha ("lock file out of sync")                        | Rode `npm install` na raiz e faça commit do `package-lock.json`                                                          |
| `EBADENGINE` / erro de versão do Node                           | Settings → General → Node.js Version = **22.x**                                                                          |
| Build não encontra `@lanona/shared` ou `angular.json`           | Root Directory errado. Deve ser a raiz do repo                                                                           |
| 404 ao recarregar uma rota                                      | O `vercel.json` não está sendo lido (Root Directory errado ou "Override" preenchido no painel)                           |
| Cadastro não entra / "Confirme seu e-mail…"                     | Confirm email ligado no Supabase (seção 2.2)                                                                             |
| "E-mail ou senha incorretos." para um usuário recém-cadastrado | E-mail não confirmado com a confirmação ligada, ou senha errada                                                          |
| Cardápio vazio e erros `permission denied` / `relation … does not exist` no console | Migrations não aplicadas: `npm run db:push` (seção 2.1)                                              |
| Upload de imagem falha                                          | Usuário não é admin (bucket `cardapio`) ou o arquivo passa de 5 MB / tipo não permitido (jpeg, png, webp, gif)          |
| Chat não atualiza sozinho                                       | Confira se a migration do chat foi aplicada (ela adiciona as tabelas à publicação `supabase_realtime`)                  |
