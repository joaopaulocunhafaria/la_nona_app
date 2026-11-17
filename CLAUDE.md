# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Monorepo for **La Nona**, a restaurant app (cardápio/menu, cart, favorites, support chat, admin tools, usage telemetry). Three independent subprojects share one backend:

| Dir | Stack | Role |
|---|---|---|
| `backend/` | Java 17, Spring Boot 3.5, Maven, PostgreSQL + Flyway, Spring Security + JWT, STOMP WebSocket, AWS S3 | REST API at `/api/**`, chat over SockJS/STOMP at `/ws` |
| `app/` | Flutter (Dart ^3.11), `provider`, `http`, `stomp_dart_client` | Mobile/desktop client |
| `web/` | Angular 19 (NgModule-based, `standalone: false`), PrimeNG 19 + Tailwind 4, `@stomp/stompjs` | Web client (customer + admin) |

**Stale docs:** some docs describe the time before the Firebase→API migration. `DEVELOPMENT.md`, `app/CLAUDE.md`, `app/GEMINI.md`, `app/MODELS.md`, `app/CHAT.md` and `backend/README.md` all say the Flutter app uses Firebase and that images are stored as base64 in the database. Neither is true any more. The Flutter app now uses the Spring API only (Firebase is gone from `pubspec.yaml`), and images are uploaded to S3, with only the URL stored. The coding standards in those docs still apply. `backend/SPRINGBOOT.md` §11 records implementation decisions and bugs that were fixed. `web/PATTERNS.md` is the web's convention guide, though some of it is copied from another project: `PermissoesService`, the cpf/cnpj pipes and `_formularios/` don't exist here.

User-facing text is **Portuguese (pt-BR)** in all three subprojects. Code identifiers mix English and Portuguese, and the web side leans Portuguese (`_modelos/`, `conectar()`, `notificacoes.service.ts`). Commit messages follow `tipo(escopo): descrição`, e.g. `feat(cardapio): ...`, `fix(backend): ...`.

## Commands

### Backend (`backend/`)
```bash
docker compose up -d                 # local Postgres 16 (db la_nona, user/pass icismep)
./mvnw spring-boot:run               # http://localhost:8080, profile 'dev' by default; Swagger at /swagger-ui.html
./mvnw test                          # unit (Mockito) + integration (Testcontainers — needs Docker)
./mvnw test -Dtest=CartServiceTest   # single test class
./mvnw test -Dtest=CartIntegrationTest#methodName   # single test method
./mvnw verify                        # tests + package
```
The production image (`Dockerfile`, deployed on Render) builds with `-DskipTests`. The `prod` profile is in `application-prod.yml`, and its secrets come from env vars (`DB_URL`, `JWT_SECRET`, `AWS_*`, `CORS_ALLOWED_ORIGINS`, `GOOGLE_CLIENT_ID`).

### Flutter app (`app/`)
```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080   # Android emulator; default is a hardcoded LAN IP in lib/data/api/api_config.dart
flutter analyze
flutter test                                   # all tests
flutter test test/widget_test.dart             # single file
```
`--dart-define=GOOGLE_SERVER_CLIENT_ID=...` turns on Google sign-in. `test/widget_test.dart` holds real unit tests that parse the backend's DTO JSON into models. `test/api_integration_test.dart` needs a running backend.

### Web (`web/`)
```bash
npm start              # ng serve on 0.0.0.0:4200; proxy.conf.json forwards /api and /ws to localhost:8080
npm run build          # runs scripts/set-env.js first (prebuild hook)
npm run build-homolog
npm test               # Karma/Jasmine
npx ng test --include src/app/modules/cart/pages/cart-page.component.spec.ts   # single spec
```
`src/environments/environment.ts` is **generated** by `scripts/set-env.js` from `API_BASE_URL` and `GOOGLE_CLIENT_ID` at build time (Vercel), so don't edit it by hand. When those env vars are missing, it falls back to the relative `/api` and `/ws` paths. Prettier (tabs, width 140, tailwind plugin) runs via lint-staged.

## Backend architecture

Layers are always `controller → service → repository → entity`. Controllers deal only in DTOs: Java `record`s in `dto/request` and `dto/response` with Bean Validation, and responses are built through a static `from(Entity)`. Business rules, plus any authorization that depends on data (e.g. "only the thread owner or an admin"), live in `service/` and throw `ForbiddenException`.

Rules that aren't obvious from reading a single file:
- **Schema**: Flyway owns the schema (`ddl-auto: validate`). Migrations are `db/migration/V{yyyyMMddHHmmss}__desc.sql`. Never edit an applied migration; add a new one. All tables live in the dedicated schema `la_nona_api`, never `public`, because the Postgres instance is shared with other projects. Native `@Query` SQL resolves tables via `search_path`, which Hikari's `connection-init-sql` sets.
- **Errors**: the `ApiException` hierarchy (`BadRequest`/`Conflict`/`Unauthorized`/`Forbidden`/`ResourceNotFound`/`StorageException`) is translated only by `GlobalExceptionHandler`. `FallbackErrorController` plus the `server.error.*` flags make sure stack traces and paths never leak to clients.
- **Security**: stateless JWT (access token plus a rotating, revocable refresh token in `refresh_tokens`). Authorization happens twice: coarsely per route in `SecurityConfig` and finely with `@PreAuthorize("hasRole('ADMIN')")`. An anonymous request to an admin endpoint returning **403 rather than 401** is intended, so leave it. Roles are stored lowercase (`'admin'`/`'cliente'`) through `RoleConverter`. Use an `AttributeConverter` whenever the DB value isn't the enum's `name()`. The first admin is promoted by hand with SQL (see `backend/README.md`).
- **Entities**: Lombok `@Builder` with `@Builder.Default` on every field that has a default. IDs use `GenerationType.UUID`. Use `saveAndFlush` whenever the response reads back `@CreationTimestamp`/`@UpdateTimestamp` in the same transaction.
- **Images**: `S3StorageService` uploads to S3 and the DB stores only the public URL (`menu_item_images.url`). Integration tests mock `AmazonS3` in `AbstractIntegrationTest`.
- **Menu item status**: the `MenuItemStatus` enum (`DISPONIVEL`, `FEITO_NA_HORA`, `VERIFICAR_DISPONIBILIDADE`, `INDISPONIVEL`) replaced the old `available` boolean. Use `isOrderable()` to decide whether an item can go into the cart. Cart totals always use the item's *current* price.
- **Chat**: REST handles threads, paginated history and unread counts. `websocket/ChatWebSocketController` handles real-time STOMP, authenticated with the JWT on CONNECT (`WebSocketConfig`).
- **Telemetry**: clients send an `X-Client-Platform` header (`MOBILE`/web) and post heartbeats, menu views and item views (`TelemetryController`). Admins read the aggregates from `TelemetryAdminController`, which uses native time-bucket queries and the projections in `repository/projection`.
- **Tests**: integration tests extend `AbstractIntegrationTest`. It uses a singleton Testcontainers Postgres (a `static` field started in a `static {}` block with `@ServiceConnection`), and each test runs in a transaction that is rolled back. Don't switch it to `@Testcontainers`/`@Container`: that restarts the container for every class and breaks the cached Spring context.

## Flutter app architecture

- `main.dart` restores the persisted session (`SessionStore`, which keeps the JWT in shared_preferences), starts `TelemetryService`, and then builds a `MultiProvider`. In that tree, `UserProfileService` feeds `AuthService` (proxy). `CartService` and `FavoritesService` are proxies of `AuthService` that load or clear themselves through `onAuthChanged`. `ChatService` holds a single shared STOMP connection.
- `lib/data/api/api_client.dart` (singleton `ApiClient`) is the one HTTP entry point. It adds the Bearer token and the `X-Client-Platform` header, applies a 30s timeout, turns error bodies into `ApiException` using the backend's `message` field, and calls `onUnauthorized` on 401/403 so `AuthService` can clear the session. It deliberately mirrors the web `AuthInterceptor`.
- `lib/services/` holds the app-level state and business services that the UI consumes. `lib/data/services/` holds lower-level data access (the menu catalog). Models live in `lib/data/models/` and `lib/models/`, each with a `fromJson` that matches a backend DTO.
- Navigation goes through `Navigator` directly, with no named routes. `widgets/auth_check.dart` is the only place that chooses between `WelcomePage` and `HomePage`. A first login is blocked until the address onboarding is done (ViaCEP lookup, `onboardingCompleted`). In the UI, `isAdmin` is derived from the backend `role`.
- Images are compressed on the client (quality 80) before upload.

## Web architecture

- Every feature is a lazy-loaded NgModule (`app-routing.module.ts`). `AuthGuard` checks for the token in localStorage, and `AdmGuard` protects the `admin/*` routes (users, telemetria, configuracoes).
- **Feature-local rule**: a feature's models and services go inside it (`modules/<feature>/_modelos/`, `modules/<feature>/_services/`). The global `src/app/services/` is only for cross-cutting concerns: auth, `auth.interceptor.ts`, chat (STOMP), telemetry, local storage, notifications.
- `AuthInterceptor` adds the Bearer token to every request except the `rotasSemAuth` routes, and logs the user out on 401/403.
- Conventions (from `web/PATTERNS.md`): no code comments, strict typing with no `any`, Signals for local component state, PrimeNG for components and Tailwind for layout, `decimal.js` for money, `date-fns` for dates. The PrimeNG theme preset is in `TemaApp.ts`, and `AppModule` registers pt-BR locale/BRL.
