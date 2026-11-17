# PATTERNS.md

Padrões do front Angular (`@lanona/web`). As regras do monorepo, do Supabase e dos testes estão no `CLAUDE.md` da raiz.

## Commands

```bash
npm start              # dev server (configuração development, Supabase local em http://127.0.0.1:55321)
npm run build          # production build
npm run build-homolog  # homologation build
npm test               # unit tests (Karma/Jasmine); test:ci for headless
npm run e2e            # Playwright E2E against the local Supabase
```

### Guards and auth

Auth is Supabase Auth. `AuthService` exposes the signals `usuario`, `isAuthenticated` and `isAdmin` (from `profiles.role`), and
`sessaoPronta()` resolves once the persisted session is restored (awaited by `provideAppInitializer` and by the guards). `AuthGuard`
redirects visitors to `/login?returnUrl=...`; `AdmGuard` sends non-admins to `/home` with an "Acesso negado" toast. There is no HTTP
interceptor: supabase-js attaches the session token itself, and `HttpClient` is only used for external APIs (ViaCEP).

### Environments

Three configurations: `environment.ts` (production), `environment.development.ts` (local Supabase), `environment.homolog.ts`, each with
`{ production, supabaseUrl, supabaseKey, googleClientId }`. `supabaseUrl` is the project BASE URL (no `/rest/v1`) and `supabaseKey` is the
publishable/anon key, never the service_role/secret key.

### Shared utilities

`src/app/utils/` contains global shared code:
- `_metodos/supabase.ts` — `deSupabase`, `dadosOuErro`, `mensagemErro`, `codigoErro`, `escaparLike`
- `_metodos/imagem.ts` — client-side image compression before uploads
- `_pipes/` — `brl.pipe.ts`, `truncate.pipe.ts`
- `_constantes/constantes.ts` — global constants (UFs, roles)

### Feature-local models and services (critical rule)

Models, enums, and services belong **inside their feature module**, never in the global `src/app/services/` or `src/app/utils/`. Use:
- `src/app/modules/[module]/[feature]/_modelos/` for interfaces and enums
- `src/app/modules/[module]/[feature]/_services/` for feature-specific services

Global `src/app/services/` is reserved for cross-cutting concerns: `SupabaseService`, `AuthService`, `UsuarioService`, `ChatService`,
`TelemetryService`, `AuthPromptService`, `NotificacoesService`. Row types come from `@lanona/shared` (generated); services map PostgREST rows
(`snake_case`) to the camelCase models used by the templates.

### Coding conventions

- No code comments. Self-documenting names only.
- Strong TypeScript typing; avoid `any`. Use `unknown` or generics when type is dynamic.
- Use Angular Signals for local state in new components.
- PrimeNG components for UI; Tailwind for layout/spacing adjustments.
- `decimal.js` for monetary calculations, `date-fns` for date operations.
- Prettier is configured with `prettier-plugin-tailwindcss`; lint-staged runs it on `src/**/*`.

## Bootstrapping a new app with these same standards

Use this section as a checklist when starting a brand-new Angular app that should follow this project's stack and conventions, regardless of its business domain.

### 1. Create the project

```bash
npx @angular/cli@19 new my-app --routing --style=scss --standalone=false
```

This generates the NgModule-based scaffold (`--standalone=false` matches this project's choice to not use standalone components).

### 2. Core dependencies

```bash
npm install primeng@^19 @primeng/themes@^19 primeicons@^7 @ng-select/ng-select@^14 \
  ngx-mask@^19 decimal.js date-fns rxjs lodash @types/lodash @types/decimal.js \
  tailwindcss@^4 @tailwindcss/postcss@^4 @tailwindcss/vite@^4 autoprefixer postcss
npm install -D prettier prettier-plugin-tailwindcss husky
```

Add only as needed (don't install speculatively): `apexcharts` + `ng-apexcharts` or `chart.js` (charts), `exceljs`/`xlsx` (spreadsheets), `jspdf` + `jspdf-autotable` (PDF export), `ngx-extended-pdf-viewer` / `ngx-doc-viewer` (document preview), `leaflet` + `@types/leaflet` (maps), `browser-image-compression` / `ngx-image-cropper` (image handling), `jsondiffpatch` (diffing), `prismjs` (code highlighting), `ngx-markdown` (markdown rendering).

### 3. `angular.json` adjustments

- `schematics` defaults: `"standalone": false`, `"style": "scss"` for components; `"standalone": false` for directives/pipes.
- `build.options.polyfills`: `["zone.js"]`; `preserveSymlinks: true`.
- Add `development` and `homolog` configurations with `fileReplacements` swapping `environment.ts`, mirroring the `production` config's `budgets`.
- Register global `styles`/`scripts` entries here only for libraries that need global CSS/JS (e.g. a chosen chart lib, map lib, syntax highlighter theme) — keep this list minimal at project start.

### 4. `tsconfig.json`

Carry over the strict compiler options: `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `isolatedModules`, `importHelpers`, `target`/`module: ES2022`, `moduleResolution: bundler`. In `angularCompilerOptions`: `strictInjectionParameters`, `strictInputAccessModifiers`, `strictTemplates`.

### 5. Prettier (`.prettierrc`)

```json
{
    "semi": true,
    "trailingComma": "all",
    "singleQuote": true,
    "printWidth": 140,
    "useTabs": true,
    "tabWidth": 3,
    "proseWrap": "always",
    "bracketSameLine": false,
    "arrowParens": "always",
    "htmlWhitespaceSensitivity": "ignore",
    "plugins": ["prettier-plugin-tailwindcss"]
}
```

Wire up Husky + lint-staged: `npx husky init`, set `.husky/pre-commit` to `npx lint-staged`, and add to `package.json`:

```json
"lint-staged": { "src/**/*": "prettier --write --ignore-unknown" }
```

### 6. Tailwind + PrimeNG theme

- `src/styles.scss`: `@use "primeicons/primeicons.css"; @use "tailwindcss";`, import the chosen Google Font, then define CSS variables under `:root` for brand colors (`--primary-blue`, `--primary-font`, etc.) so components reference variables instead of hardcoded values.
- Create `src/app/TemaIcismep.ts`-equivalent (e.g. `src/app/TemaApp.ts`) using `definePreset(Aura, {...})` from `@primeng/themes` to customize the PrimeNG Aura preset's `primitive` palette and `semantic` tokens to match the new brand.
- Register the theme in `providePrimeNG({ theme: { preset: TemaApp, options: { ripple: true, darkModeSelector: false } }, translation: { ...pt-BR PrimeNG translation object... } })` inside `AppModule` providers.

### 7. `AppModule` baseline providers

Regardless of domain, a new app should wire up:
- `LOCALE_ID: 'pt'`, `DEFAULT_CURRENCY_CODE: 'BRL'` (or whatever locale/currency fits; register locale data via `registerLocaleData`).
- `provideAnimationsAsync()`.
- `providePrimeNG(...)` with the custom theme + full Portuguese translation object (copy from this project's `app.module.ts` and adjust only the theme).
- `MessageService` (PrimeNG toasts) + `ToastModule` import.
- `provideNgxMask()` / `provideEnvironmentNgxMask()` if input masks are needed.
- A single typed backend client service (here `SupabaseService`) and, if the backend needs it, an app initializer that restores the session before the first screen. Only add an HTTP interceptor when talking to a token-based REST API.

### 8. Cross-cutting services and guards to recreate

These are domain-agnostic and should exist in every app built this way, under `src/app/services/` and `src/app/guards/`:
- `AuthService` — login/logout and session signals (`isAuthenticated()`), backed by the BaaS auth client.
- `AuthGuard` — `CanActivate` checking `isAuthenticated()`, redirecting to `/login`; optionally handle a forced first-access password reset flow.
- A role/permission guard (`AdmGuard`-equivalent) — reads the logged-in user from `localStorage`, compares `route.data['funcaoSistema']` (or equivalent role key) against the user's role, shows a PrimeNG toast and redirects on failure.
- `PermissoesService` — fine-grained `has(permission, acao?)` checks, with an admin/superuser role bypassing all checks.
- `LocalStorageService`, `CryptoService` (if encrypting any localStorage values), `DrawerService` (if using a side-drawer pattern), `NotificacoesService`.

### 9. Folder structure to scaffold under `src/app/`

```
components/        # global reusable UI components (sidebar, topbar, cards, etc.)
guards/             # AuthGuard, role guard, permission guard
services/           # cross-cutting services only (see §8)
modules/
  common/           # login, criar-conta, recuperar-senha, base layout (sidebar+topbar shell), FAQ, etc.
  [role-a]/          # feature modules grouped by user role, e.g. adm/, fornecedores/
  [role-b]/
utils/
  _pipes/           # brl.pipe.ts-equivalents, cpf/cnpj, date-br, telefone, truncate, safe
  _models/          # only cross-feature shared interfaces (page.d.ts-equivalent, etc.)
  _formularios/      # shared form validators
  _constantes/       # constantes.ts global constants
  _enums/, _metodos/, objetos/  # as needed, kept generic/cross-cutting
TemaApp.ts          # PrimeNG theme preset
```

Within each feature module, replicate the local-first pattern: `_modelos/` (or `_models/`) for interfaces/enums and `services/` (or `_services/`) for services that live **inside** the feature, not in the global folders. Pages live under a `pages/` subfolder, with nested modals/sub-views as sibling folders next to the page that owns them.

### 10. Environments

Define `environment.ts` (production), `environment.development.ts` (local backend, e.g. Supabase CLI on 127.0.0.1) and `environment.homolog.ts`,
swapped via `fileReplacements`. For a BaaS, keep only public values here (project URL + publishable key) and guard the production build
with a script that fails when `environment.ts` does not point to production (see `scripts/verificar-ambiente-producao.mjs`).

### 11. Dev proxy (only for a self-hosted REST API)

If the app talks to its own REST API instead of a BaaS, add a `proxy.conf.json` mapping `/api` to the local backend (`changeOrigin: true`,
`secure: false`) and keep API URLs path-relative outside of production.

### 12. Verify the bootstrap

Run `npm run build` after the initial scaffold (theme, `AppModule` providers, routing, one guard, one feature module) to confirm the TypeScript/Angular template compiler accepts the setup before building out real business logic.
