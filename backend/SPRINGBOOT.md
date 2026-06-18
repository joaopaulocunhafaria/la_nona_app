# SPRINGBOOT.md

Plano de migração dos serviços hoje hospedados no Firebase (Authentication, Firestore, Storage) para um backend próprio em **Java 17 + Spring Boot 3.5.x**, com **PostgreSQL**, **Flyway**, **Spring Security** e **JWT**, em **arquitetura em camadas** (controller → service → repository → entity).

Este documento mapeia tudo que existe hoje no app Flutter (`la_nona`), propõe a modelagem relacional equivalente, define a API nova e termina com um prompt pronto para o Claude Code implementar o backend.

**Escopo**: apenas o backend novo. O app Flutter não é alterado por este plano — a troca dos `services` Dart para consumir a API nova é um passo seguinte (ver seção 10).

---

## 1. Decisões e premissas assumidas

Estas decisões foram confirmadas com o usuário ou adotadas como padrão técnico razoável; estão documentadas aqui para qualquer implementação futura não precisar re-perguntar:

1. **Login Google é mantido.** O backend recebe o `idToken` do Google (obtido pelo app via `google_sign_in`, como hoje), valida com `GoogleIdTokenVerifier` e emite seu **próprio** JWT — o app para de falar com o Firebase Auth, mas continua oferecendo "Entrar com Google".
2. **Tempo real só para o chat.** Carrinho, favoritos e lista de usuários (admin) passam a ser REST puro (sem push). O chat de suporte usa **WebSocket/STOMP**, porque é o único fluxo onde a espera por refresh manual prejudicaria a experiência.
3. **Sem dados de produção a migrar.** É um projeto greenfield — o plano não inclui exportação/importação de dados reais do Firestore/Firebase Auth, só o schema novo do zero.
4. **IDs**: todas as entidades passam a usar `UUID` gerado no banco, abandonando os IDs do Firebase (uid do Auth, timestamps usados como id de `menu_items`).
5. **`isAdmin` deixa de existir como coluna própria.** Hoje o Firestore tem duas fontes de verdade conflitantes (`isAdmin` boolean e `role` string, com fallback manual em `UserProfile.fromDoc`). No banco novo só existe `role`; `isAdmin` é derivado (`role == 'admin'`) na camada de DTO/resposta.
6. **Endereço embutido em `users`.** É um relacionamento 1:1 pequeno e sempre presente — vira colunas `address_*` na própria tabela `users`, em vez de uma tabela separada (equivalente ao mapa aninhado do Firestore).
7. **Carrinho e favoritos são normalizados.** Hoje cada documento de `cart`/`favorites` guarda uma cópia (snapshot) completa do item de cardápio. No modelo relacional isso passa a ser só uma referência (`menu_item_id`) com `JOIN` para os dados atuais. **Mudança de comportamento intencional**: o preço exibido no carrinho passa a refletir o preço *atual* do item, não o preço no momento em que foi adicionado.
8. **Imagens como texto, com convenção de Data URI.** Por exigência do usuário, sem S3: todo campo de imagem é `TEXT` contendo uma *data URI* (`data:{contentType};base64,{dados}`) quando a imagem foi enviada pelo próprio usuário (foto de perfil custom, fotos de item de cardápio). A foto de perfil vinda do Google continua sendo a URL `https://` original (não é baixada/reconvertida) — o mesmo campo de texto comporta os dois formatos; quem renderiza decide pelo prefixo (`data:` → decodifica base64, `http` → carrega da rede).
9. **ViaCEP continua client-side.** A busca de CEP não tem relação com Firebase e não muda — o Flutter continua chamando `https://viacep.com.br/ws/{cep}/json/` diretamente.
10. **Localização do projeto**: novo módulo em `backend/` na raiz deste repositório (`la_nona/backend`), Maven, independente do projeto Flutter.
11. **Stack**: Java 17 + Spring Boot 3.5.x, Maven, `jjwt` para JWT, `google-api-client` para validar token do Google, `spring-boot-starter-websocket` para STOMP, `springdoc-openapi` para Swagger UI. *(Decisão revista: o pedido original era Java 11 + Spring Boot 2.7.x, mas o Spring Initializr hospedado (start.spring.io) não aceita mais gerar projetos abaixo da versão 3.5.0 — testado em 2026-06-18, retorna `400 Bad Request` para qualquer `bootVersion` anterior a essa. Como Spring Boot 3.x exige Java 17+, e o usuário confirmou a atualização, o projeto usa Java 17 + Spring Boot 3.5.15. Isso também significa namespace `jakarta.*` em vez de `javax.*` para JPA/Validation/Servlet.)*
12. **Sem conceito de Pedido/Checkout.** O botão "Finalizar Pedido" no carrinho hoje só mostra "em desenvolvimento" — não existe entidade Pedido no app atual, então este plano não cria uma. Pode ser adicionado depois, fora deste escopo.

---

## 2. Estado atual: operações por domínio (equivalentes a "endpoints")

O Flutter não tem rotas REST — fala direto com SDKs do Firebase. As tabelas abaixo documentam cada operação encontrada no código e o endpoint REST/WS equivalente que ela vai virar.

### 2.1 Autenticação — `app/lib/services/auth_service.dart`

| Operação atual | Implementação hoje | Endpoint futuro |
|---|---|---|
| `registrar(email, senha)` | `FirebaseAuth.createUserWithEmailAndPassword`, valida email/senha não vazios e senha ≥ 8 chars | `POST /api/auth/register` |
| `login(email, senha)` | `FirebaseAuth.signInWithEmailAndPassword` | `POST /api/auth/login` |
| `loginComGoogle()` | `GoogleSignIn().signIn()` + `FirebaseAuth.signInWithCredential` | `POST /api/auth/google` |
| `logout()` | `FirebaseAuth.signOut()` + `GoogleSignIn().signOut()` + limpa perfil local | `POST /api/auth/logout` |
| `authStateChanges()` (listener contínuo) | Stream do SDK Firebase, atualiza `UserProvider`/`AuthCheck` | Sem equivalente em REST; cliente passa a guardar o JWT localmente e validar no boot chamando `GET /api/users/me` |
| Renovação implícita de sessão | Gerenciada pelo SDK Firebase | `POST /api/auth/refresh` |

Mensagens de erro hoje são amigáveis em PT-BR (`_handleFirebaseAuthException`: e-mail já cadastrado, senha incorreta, usuário não encontrado, etc.) — replicar o mesmo texto no backend novo.

### 2.2 Perfil & endereço — `app/lib/services/user_profile_service.dart`

| Operação atual | Firestore | Endpoint futuro |
|---|---|---|
| `syncCurrentUser(user)` (cria doc `users/{uid}` no 1º login ou atualiza nome/foto/email) | `users/{uid}` set/update | Acontece dentro de `POST /api/auth/register` \| `/login` \| `/google` |
| `watchCurrentUser(uid)` (stream do perfil) | `users/{uid}.snapshots()` | `GET /api/users/me` |
| `saveAddress(...)` (seta `onboardingCompleted=true`) | `users/{uid}.update({address, onboardingCompleted})` | `PUT /api/users/me/address` |
| `updateProfilePhoto(url)` | `users/{uid}.update({photoUrl})` | `PUT /api/users/me/photo` |
| `fetchAddressByCep(cep)` | chama ViaCEP | **inalterado**, continua no Flutter |
| `uploadProfilePhoto(file, uid)` — `storage_service.dart` | Firebase Storage `profiles/{uid}/profile_photo.jpg` | Embutido no `PUT /api/users/me/photo` (recebe a imagem já em base64, sem Storage) |

### 2.3 Admin — gestão de usuários — `admin_user_management_page.dart`

| Operação atual | Firestore | Endpoint futuro |
|---|---|---|
| `getUsersStream()` + filtro client-side por nome/email | `users` orderBy(name).snapshots() | `GET /api/admin/users?search=` |
| `updateUserRole(uid, role)` | `users/{uid}.update({role, isAdmin})` | `PUT /api/admin/users/{id}/role` |

### 2.4 Cardápio — `app/lib/data/services/menu_item_service.dart`

| Operação atual | Firestore | Endpoint futuro |
|---|---|---|
| `createMenuItem(item)` | `menu_items/{id}.set(...)` | `POST /api/menu-items` (ROLE_ADMIN) |
| `updateMenuItem(item)` | `menu_items/{id}.update(...)` | `PUT /api/menu-items/{id}` (ROLE_ADMIN) |
| `deleteMenuItem(id)` (também apaga imagens no Storage) | `menu_items/{id}.delete()` + `storageService.deleteImages` | `DELETE /api/menu-items/{id}` (ROLE_ADMIN) — apaga linhas de `menu_item_images` em cascata |
| `getMenuItem(id)` | `menu_items/{id}.get()` | `GET /api/menu-items/{id}` (público) |
| `getMenuItems()` | `menu_items.orderBy(createdAt desc).snapshots()` | `GET /api/menu-items` (público) |
| `getMenuItemsByCategory(cat)` | `where(category==cat)` | `GET /api/menu-items?category=` |
| `getAvailableMenuItems()` | `where(available==true)` | `GET /api/menu-items?available=true` |
| `searchMenuItems(query)` | `orderBy(name).startAt/endAt` (prefix search) | `GET /api/menu-items?q=` |
| `uploadMenuItemImage` / `uploadMultipleImages` — `storage_service.dart` | Firebase Storage `menu_items/{itemId}/{timestamp}.jpg` | Imagens vão embutidas (base64) no corpo de `POST`/`PUT /api/menu-items` |

### 2.5 Carrinho — `app/lib/services/cart_service.dart` (subcoleção `users/{uid}/cart`)

| Operação atual | Endpoint futuro |
|---|---|
| `_listenToCart(uid)` (stream) | `GET /api/cart` |
| `addToCart(menuItem)` (incrementa se já existe) | `POST /api/cart/items` |
| `updateQuantity(itemId, qty)` (remove se qty ≤ 0) | `PUT /api/cart/items/{menuItemId}` |
| `removeFromCart(itemId)` | `DELETE /api/cart/items/{menuItemId}` |
| `clearCart()` | `DELETE /api/cart` |
| `total` (getter calculado client-side) | calculado no backend e devolvido no `GET /api/cart` |

### 2.6 Favoritos — `app/lib/services/favorites_service.dart` (subcoleção `users/{uid}/favorites`)

| Operação atual | Endpoint futuro |
|---|---|
| `_listenToFavorites(uid)` (stream) | `GET /api/favorites` |
| `toggleFavorite(item)` (set ou delete) | `POST /api/favorites/{menuItemId}` / `DELETE /api/favorites/{menuItemId}` |

### 2.7 Chat de suporte — `app/lib/services/chat_service.dart` (coleção `chats` + subcoleção `messages`)

| Operação atual | Endpoint futuro |
|---|---|
| `getAllThreads()` (admin, stream) | `GET /api/chat/threads` (ROLE_ADMIN) |
| `getTotalUnreadCountAdmin()` (stream) | `GET /api/chat/threads/unread-count` (ROLE_ADMIN) |
| `getUnreadCountForUser(userId)` (stream) | `GET /api/chat/my-thread/unread-count` |
| `getMessages(userId)` (stream) | `GET /api/chat/threads/{userId}/messages` (REST, histórico paginado) + `STOMP /topic/chat.{userId}` (tempo real) |
| `sendMessage(...)` (WriteBatch: grava mensagem + atualiza thread) | `STOMP SEND /app/chat.{userId}.send` |
| `markAsRead(userId)` / `markAsReadForUser(userId)` | `PUT /api/chat/threads/{userId}/read?as=admin\|user` |

Ver detalhes do desenho WebSocket na seção 7.

---

## 3. Modelagem de dados (PostgreSQL)

### 3.1 Relacionamentos

```
users (1) ──── (N) refresh_tokens
users (1) ──── (N) cart_items ──── (N:1) menu_items ──── (1:N) menu_item_images
users (1) ──── (N) favorites  ──── (N:1) menu_items
users (1) ──── (1) chat_threads ──── (1:N) chat_messages
```

### 3.2 Tabelas

**`users`**
| Coluna | Tipo | Observações |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `email` | VARCHAR(255) UNIQUE NOT NULL | |
| `password_hash` | VARCHAR(255) NULL | NULL quando `provider='google'` |
| `name` | VARCHAR(255) NOT NULL DEFAULT '' | |
| `photo` | TEXT NULL | data URI ou URL do Google — ver premissa 8 |
| `provider` | VARCHAR(20) NOT NULL DEFAULT 'local' | CHECK IN ('local','google') |
| `role` | VARCHAR(20) NOT NULL DEFAULT 'cliente' | CHECK IN ('cliente','entregador','admin') |
| `onboarding_completed` | BOOLEAN NOT NULL DEFAULT false | |
| `address_cep` | VARCHAR(9) | formato `00000-000` |
| `address_rua` | VARCHAR(255) | |
| `address_bairro` | VARCHAR(255) | |
| `address_numero` | VARCHAR(10) | |
| `address_cidade` | VARCHAR(255) | |
| `address_estado` | VARCHAR(2) | |
| `address_complemento` | VARCHAR(60) | |
| `created_at` / `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

**`refresh_tokens`**: `id` UUID PK, `user_id` FK→users, `token_hash` VARCHAR(255), `expires_at` TIMESTAMPTZ, `revoked` BOOLEAN DEFAULT false, `created_at` TIMESTAMPTZ.

**`menu_items`**: `id` UUID PK, `name` VARCHAR(255) NOT NULL, `description` TEXT NOT NULL, `price` NUMERIC(10,2) NOT NULL CHECK (price > 0), `category` VARCHAR(30) NOT NULL CHECK IN ('Hamburguer','Pizza','Salada','Bebida','Sobremesa','Acompanhamento','Outro'), `available` BOOLEAN NOT NULL DEFAULT true, `created_at`/`updated_at` TIMESTAMPTZ.

**`menu_item_images`**: `id` UUID PK, `menu_item_id` FK→menu_items ON DELETE CASCADE, `image_data` TEXT NOT NULL (data URI completa), `position` INT NOT NULL DEFAULT 0 (ordem no carrossel), `created_at` TIMESTAMPTZ.

**`cart_items`**: `id` UUID PK, `user_id` FK→users ON DELETE CASCADE, `menu_item_id` FK→menu_items ON DELETE CASCADE, `quantity` INT NOT NULL CHECK (quantity > 0), `added_at` TIMESTAMPTZ, UNIQUE(`user_id`,`menu_item_id`).

**`favorites`**: `id` UUID PK, `user_id` FK→users ON DELETE CASCADE, `menu_item_id` FK→menu_items ON DELETE CASCADE, `created_at` TIMESTAMPTZ, UNIQUE(`user_id`,`menu_item_id`).

**`chat_threads`**: `user_id` UUID PK FK→users ON DELETE CASCADE (a thread é identificada pelo id do cliente, igual ao Firestore hoje), `last_message` TEXT, `updated_at` TIMESTAMPTZ, `admin_unread_count` INT NOT NULL DEFAULT 0, `user_unread_count` INT NOT NULL DEFAULT 0.

**`chat_messages`**: `id` UUID PK, `thread_user_id` FK→chat_threads(user_id) ON DELETE CASCADE, `sender_id` FK→users, `text` TEXT NOT NULL, `is_admin` BOOLEAN NOT NULL DEFAULT false, `sent_at` TIMESTAMPTZ NOT NULL DEFAULT now().

### 3.3 Migrations Flyway

```
V20260618120001__create_users_table.sql
V20260618120002__create_refresh_tokens_table.sql
V20260618120003__create_menu_items_table.sql
V20260618120004__create_menu_item_images_table.sql
V20260618120005__create_cart_items_table.sql
V20260618120006__create_favorites_table.sql
V20260618120007__create_chat_threads_table.sql
V20260618120008__create_chat_messages_table.sql
V20260618120009__seed_admin_user.sql   -- opcional: 1 usuário admin de dev para poder logar e popular o cardápio
```

---

## 4. Arquitetura em camadas / estrutura de pacotes

```
backend/
├── pom.xml
├── src/main/java/com/lanona/api/
│   ├── ApiApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java
│   │   ├── WebSocketConfig.java
│   │   └── CorsConfig.java
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── UserController.java
│   │   ├── AdminUserController.java
│   │   ├── MenuItemController.java
│   │   ├── CartController.java
│   │   ├── FavoriteController.java
│   │   └── ChatController.java          (REST: threads, histórico, marcar como lido)
│   ├── websocket/
│   │   └── ChatWebSocketController.java (@MessageMapping STOMP, envio/recebimento)
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── GoogleTokenVerifierService.java
│   │   ├── UserService.java
│   │   ├── MenuItemService.java
│   │   ├── CartService.java
│   │   ├── FavoriteService.java
│   │   └── ChatService.java
│   ├── repository/      (Spring Data JPA, um por entidade)
│   ├── entity/           (User, RefreshToken, MenuItem, MenuItemImage, CartItem, Favorite, ChatThread, ChatMessage)
│   ├── dto/
│   │   ├── request/       (RegisterRequest, LoginRequest, GoogleLoginRequest, AddressRequest, MenuItemRequest, ...)
│   │   └── response/      (AuthResponse, UserResponse, MenuItemResponse, CartResponse, ChatMessageResponse, ...)
│   ├── security/
│   │   ├── JwtTokenProvider.java
│   │   ├── JwtAuthenticationFilter.java
│   │   ├── UserPrincipal.java
│   │   └── CustomUserDetailsService.java
│   └── exception/
│       ├── ApiException.java  (+ ResourceNotFoundException, ConflictException, UnauthorizedException, ...)
│       └── GlobalExceptionHandler.java   (@ControllerAdvice)
└── src/main/resources/
    ├── application.yml        (perfis dev/prod)
    └── db/migration/          (V1..V9 da seção 3.3)
```

Regras gerais: controllers nunca acessam repository diretamente; entidades JPA nunca são devolvidas no corpo de resposta (sempre via DTO); toda regra de negócio (validações, cálculo de total, normalização de CEP, etc.) vive em `service/`.

> **Status (2026-06-18): implementação completa (fases 1 a 8).** Todas as migrations, entidades, services, controllers, segurança (JWT + Google), WebSocket/STOMP do chat e testes (unitários + integração com Testcontainers) descritos neste documento foram implementados, testados manualmente ponta a ponta (curl + script Python de STOMP) e cobertos por `mvn clean verify` (27 testes, 0 falhas). Detalhes e decisões tomadas durante a implementação (não previstas em detalhe no plano original) na seção 11.

---

## 5. Segurança

- Stateless: `SessionCreationPolicy.STATELESS`, sem sessão HTTP.
- `JwtAuthenticationFilter` (`OncePerRequestFilter`) lê `Authorization: Bearer <token>`, valida com `JwtTokenProvider`, popula o `SecurityContext`.
- Senhas: `BCryptPasswordEncoder`. Regra mínima de 8 caracteres (igual à validação atual do `AuthService.registrar`), mensagens de erro amigáveis em PT-BR replicando o padrão de `_handleFirebaseAuthException` (e-mail já cadastrado, senha incorreta, usuário não encontrado, etc.).
- Roles: `ROLE_CLIENTE`, `ROLE_ENTREGADOR`, `ROLE_ADMIN`. Autorização por método com `@PreAuthorize("hasRole('ADMIN')")` nos endpoints administrativos (gestão de usuários, CRUD de cardápio).
- **Login Google**: `GoogleTokenVerifierService` usa `GoogleIdTokenVerifier` (`google-api-client`) para validar o `idToken` enviado pelo app contra o Client ID configurado; se válido, faz upsert do usuário (`provider='google'`, sem `password_hash`) e emite o JWT normalmente.
- JWT: claims mínimas `sub` (user id), `role`, `email`. Access token de vida curta (ex.: 1h); `refresh_tokens` em tabela própria com vida longa (ex.: 30 dias) e capacidade de revogação (`logout` marca `revoked=true`).
- CORS configurável via `application.yml`.
- WebSocket: `ChannelInterceptor` lê o header STOMP `Authorization` no frame `CONNECT`, valida o JWT da mesma forma que o filtro REST, e associa o `Principal` (userId + role) à sessão STOMP.

---

## 6. API REST

### 6.1 Auth (público)
| Método | Rota | Body | Resposta |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, password, name}` | `201 {accessToken, refreshToken, user}` |
| POST | `/api/auth/login` | `{email, password}` | `200 {accessToken, refreshToken, user}` |
| POST | `/api/auth/google` | `{idToken}` | `200 {accessToken, refreshToken, user}` |
| POST | `/api/auth/refresh` | `{refreshToken}` | `200 {accessToken, refreshToken}` |
| POST | `/api/auth/logout` | `{refreshToken}` (auth Bearer) | `204` |

### 6.2 Perfil (auth: Bearer, qualquer role)
| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/api/users/me` | — | `UserResponse` |
| PUT | `/api/users/me/address` | `{cep,rua,bairro,numero,cidade,estado,complemento}` | `UserResponse` (seta `onboardingCompleted=true`) |
| PUT | `/api/users/me/photo` | `{imageBase64, contentType}` | `UserResponse` |

### 6.3 Admin — usuários (ROLE_ADMIN)
| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/api/admin/users?search=` | — | `List<UserResponse>` |
| PUT | `/api/admin/users/{id}/role` | `{role}` | `UserResponse` |

### 6.4 Cardápio
| Método | Rota | Auth | Body | Resposta |
|---|---|---|---|---|
| GET | `/api/menu-items?category=&available=&q=` | público | — | `List<MenuItemResponse>` |
| GET | `/api/menu-items/{id}` | público | — | `MenuItemResponse` |
| POST | `/api/menu-items` | ROLE_ADMIN | `{name,description,price,category,available,images:[{base64,contentType}]}` | `201 MenuItemResponse` |
| PUT | `/api/menu-items/{id}` | ROLE_ADMIN | idem (lista `images` substitui a anterior) | `MenuItemResponse` |
| DELETE | `/api/menu-items/{id}` | ROLE_ADMIN | — | `204` |

### 6.5 Carrinho (auth: Bearer, dono do recurso)
| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/api/cart` | — | `{items:[...], total}` |
| POST | `/api/cart/items` | `{menuItemId, quantity?}` | adiciona ou incrementa |
| PUT | `/api/cart/items/{menuItemId}` | `{quantity}` | quantity ≤ 0 remove |
| DELETE | `/api/cart/items/{menuItemId}` | — | remove item |
| DELETE | `/api/cart` | — | limpa carrinho |

### 6.6 Favoritos (auth: Bearer, dono do recurso)
| Método | Rota | Resposta |
|---|---|---|
| GET | `/api/favorites` | `List<MenuItemResponse>` |
| POST | `/api/favorites/{menuItemId}` | adiciona |
| DELETE | `/api/favorites/{menuItemId}` | remove |

### 6.7 Chat — REST (parte não realtime)
| Método | Rota | Auth | Resposta |
|---|---|---|---|
| GET | `/api/chat/threads` | ROLE_ADMIN | `List<ChatThreadResponse>` ordenado por `updatedAt` desc |
| GET | `/api/chat/threads/unread-count` | ROLE_ADMIN | `{total}` |
| GET | `/api/chat/my-thread/unread-count` | dono | `{count}` |
| GET | `/api/chat/threads/{userId}/messages?page=&size=` | dono ou ROLE_ADMIN | `Page<ChatMessageResponse>` |
| PUT | `/api/chat/threads/{userId}/read?as=admin\|user` | dono ou ROLE_ADMIN | zera o contador correspondente |

---

## 7. Chat em tempo real (WebSocket/STOMP)

- Endpoint de conexão: `/ws` (SockJS fallback habilitado).
- Broker simples em memória (`enableSimpleBroker`) — suficiente neste estágio, sem RabbitMQ.
- Conexão autenticada: cliente conecta com header STOMP `Authorization: Bearer <jwt>`.
- Envio: `SEND /app/chat.{userId}.send` com payload `{text}`. `{userId}` é o id da thread (= id do cliente). O servidor identifica pelo `Principal` se quem enviou é o próprio cliente ou um admin.
- Persistência: dentro de uma transação (`@Transactional`), grava a `chat_messages` e atualiza `chat_threads` (`last_message`, `updated_at`, incrementa `admin_unread_count` se enviado pelo cliente, ou `user_unread_count` se enviado por admin) — equivalente ao `WriteBatch` atual do `ChatService.sendMessage`.
- Broadcast: `/topic/chat.{userId}` recebe a nova mensagem (assinado pelo cliente da thread e por qualquer admin com a tela aberta); `/topic/chat.admin.threads` recebe um resumo da thread atualizada, para a lista do admin atualizar sem reload.

---

## 8. Fases de implementação

1. ✅ **Scaffolding** — `pom.xml`, `application.yml` (perfis `dev`/`prod`), `docker-compose.yml` com Postgres local, Flyway configurado.
2. ✅ **Schema** — todas as migrations da seção 3.3.
3. ✅ **Auth** — entidades `User`/`RefreshToken`, `JwtTokenProvider`, filtro, `/api/auth/*` (local + Google), testes do fluxo de registro/login.
4. ✅ **Perfil & Admin de usuários** — `/api/users/me`, endereço, foto, `/api/admin/users/*`.
5. ✅ **Cardápio** — `MenuItem` + `MenuItemImage`, CRUD completo com `@PreAuthorize`, filtros/busca.
6. ✅ **Carrinho & Favoritos** — entidades + endpoints, regras de quantidade/duplicidade.
7. ✅ **Chat** — REST (threads/histórico/read) + WebSocket/STOMP (config, interceptor de auth, handler de envio).
8. ✅ **Testes & documentação** — testes de integração com Testcontainers (Postgres real), Swagger/OpenAPI (`springdoc-openapi`).

Todas as fases concluídas em 2026-06-18. Ver seção 11 para decisões/ajustes feitos durante a implementação que não estavam (ou estavam erradas) no plano original.

---

## 9. Fora de escopo (próximos passos, não fazer agora)

- Trocar os `services` Dart (`auth_service.dart`, `menu_item_service.dart`, `cart_service.dart`, etc.) para consumir esta API em vez do Firebase.
- Migrar imagens de base64-em-coluna para um object storage (S3/MinIO) quando o volume de dados justificar.
- Conceito de Pedido/Checkout (hoje é só um placeholder no carrinho).
- Rate limiting, observabilidade/métricas, deploy/CI.

---

## 10. Prompt para o Claude Code

Copie o bloco abaixo para iniciar a implementação em uma sessão do Claude Code dentro deste repositório.

```
Contexto: este repositório tem um app Flutter em `app/` que hoje usa Firebase
(Authentication, Firestore, Storage) como backend. Estou criando, em paralelo,
um novo backend em Java 17 + Spring Boot 3.5.x que vai substituir o Firebase. O
plano completo de migração — mapeamento de tudo que existe hoje, modelagem de
dados e API proposta — está documentado em backend/SPRINGBOOT.md. Leia esse
arquivo INTEGRALMENTE antes de começar, especialmente a seção 1 (decisões e
premissas) e a nota de status logo após o diagrama de pacotes na seção 4.

Não altere nada dentro de app/ (o app Flutter). Esta tarefa cobre apenas o
backend.

O módulo Maven em `backend/` JÁ EXISTE (gerado via Spring Initializr,
Java 17 / Spring Boot 3.5.15) com: `pom.xml` com todas as dependências da
stack abaixo, `application.yml` com perfis `dev`/`prod`, `docker-compose.yml`
com Postgres local, e a estrutura de pacotes
(`config/`, `controller/`, `websocket/`, `service/`, `repository/`,
`entity/`, `dto/request/`, `dto/response/`, `security/`, `exception/`) já
criada, cada uma com um `package-info.java` descrevendo seu papel. Continue a
partir dessa estrutura — não regenere o projeto do zero, e use o namespace
`jakarta.*` (não `javax.*`) para JPA/Validation, como exige o Spring Boot 3.x.

STACK JÁ CONFIGURADA NO POM (não precisa adicionar de novo)
- Java 17, Spring Boot 3.5.15.
- PostgreSQL como banco (driver `org.postgresql:postgresql`).
- Flyway (`flyway-core` + `flyway-database-postgresql`) para todas as
  migrations de schema — nenhuma tabela criada via `ddl-auto` (já está
  configurado como `validate` em `application.yml`), sempre via SQL
  versionado em `src/main/resources/db/migration`.
- Spring Security (autenticação stateless via JWT, biblioteca `jjwt`).
- `google-api-client` para validar o `idToken` do login com Google
  (`GoogleIdTokenVerifier`).
- `spring-boot-starter-websocket` para o chat (STOMP sobre SockJS).
- `springdoc-openapi-starter-webmvc-ui` para documentação automática
  (Swagger UI em `/swagger-ui.html`).
- Testcontainers (`spring-boot-testcontainers` + `org.testcontainers:junit-jupiter`
  + `org.testcontainers:postgresql`) para os testes de integração.

Arquitetura em camadas: controller → service → repository → entity (JPA),
com DTOs de request/response — entidades JPA nunca são serializadas
diretamente na resposta HTTP.

O QUE IMPLEMENTAR (siga backend/SPRINGBOOT.md como fonte de verdade para os
detalhes — campos exatos, regras de validação, convenção de imagem em data
URI, nomes de rota, etc.):

1. Schema Postgres via Flyway: tabelas `users`, `refresh_tokens`,
   `menu_items`, `menu_item_images`, `cart_items`, `favorites`,
   `chat_threads`, `chat_messages` — ver seção 3 de SPRINGBOOT.md para
   colunas, tipos, constraints e relacionamentos exatos.

2. Autenticação: registro/login com email+senha (BCrypt, mínimo 8
   caracteres, mensagens de erro amigáveis em PT-BR), login com Google
   (valida idToken, faz upsert do usuário), emissão de access token (JWT,
   ~1h) + refresh token (tabela própria, revogável), endpoint de logout que
   revoga o refresh token. Ver seção 6.1.

3. Perfil do usuário: `GET /api/users/me`, salvar endereço (mesmas
   validações de CEP/UF/número do `AddressFormService` atual — CEP com 8
   dígitos, UF entre as 27 válidas), atualizar foto de perfil recebendo
   `{imageBase64, contentType}` e armazenando como data URI no campo
   `photo`. Ver seções 2.2 e 6.2.

4. Admin de usuários: listar/buscar usuários por nome ou email, atualizar
   `role` de um usuário (`cliente`, `entregador`, `admin`), protegido por
   `@PreAuthorize("hasRole('ADMIN')")`. Ver seções 2.3 e 6.3.

5. Cardápio: CRUD completo de `menu_items` (criação/edição/exclusão restrita
   a ROLE_ADMIN; leitura e busca públicas), com lista de imagens em base64
   por item (tabela `menu_item_images`, mantendo a ordem via coluna
   `position`), filtros por categoria/disponibilidade e busca por nome. Ver
   seções 2.4 e 6.4. Categorias válidas:
   Hamburguer, Pizza, Salada, Bebida, Sobremesa, Acompanhamento, Outro.

6. Carrinho: adicionar item (incrementa se já existir), atualizar
   quantidade (remove se ≤ 0), remover item, limpar carrinho, listar com
   total calculado a partir do preço ATUAL do item de cardápio (join, não
   snapshot). Sempre restrito ao usuário autenticado dono do carrinho. Ver
   seções 2.5 e 6.5.

7. Favoritos: adicionar/remover/listar, restrito ao usuário autenticado. Ver
   seções 2.6 e 6.6.

8. Chat de suporte:
   - REST: listar threads (admin), contagem de não lidas (admin e usuário),
     histórico paginado de mensagens de uma thread, marcar como lida.
   - WebSocket/STOMP: endpoint `/ws` (SockJS), autenticação via header
     `Authorization` no frame CONNECT, envio de mensagem em
     `/app/chat.{userId}.send`, broadcast em `/topic/chat.{userId}` e
     `/topic/chat.admin.threads`. A persistência da mensagem + atualização
     da thread (last_message, updated_at, contador de não lidas) deve ser
     atômica (`@Transactional`), replicando a lógica do `WriteBatch` atual
     descrita na seção 7 de SPRINGBOOT.md. Regra de RBAC: um usuário comum
     só pode enviar/ler na própria thread (`userId` = seu próprio id); um
     admin pode enviar/ler em qualquer thread.

9. Tratamento de erros: `@ControllerAdvice` único devolvendo um formato de
   erro JSON consistente (status, mensagem, timestamp) para todas as
   exceções de negócio e de validação.

10. Testes: cobertura de unidade nos services (regras de negócio: validação
    de senha, normalização de CEP, cálculo de total do carrinho, RBAC do
    chat) e pelo menos um teste de integração por domínio principal (auth,
    cardápio, carrinho, chat) usando Testcontainers com Postgres real — não
    mockar o banco nesses testes de integração.

11. `docker-compose.yml` na raiz de `backend/` com um serviço Postgres para
    desenvolvimento local, e um `README.md` dentro de `backend/` explicando
    como subir o banco, rodar as migrations e iniciar a aplicação.

FORA DE ESCOPO — não fazer:
- Não toque no código Flutter em `app/lib/`.
- Não implemente armazenamento de imagens em S3/object storage — é só texto
  no banco (data URI), por decisão explícita já registrada em SPRINGBOOT.md.
- Não crie conceito de Pedido/Checkout.
- Não implemente scripts de importação de dados do Firebase — é um schema
  novo, sem dados legados a migrar.

Se encontrar qualquer decisão de implementação não coberta com detalhe
suficiente em SPRINGBOOT.md (ex.: formato exato de algum DTO, nome de algum
header, comportamento de borda não especificado), PARE e pergunte antes de
assumir — não invente regras de negócio novas.

Ao terminar cada fase da seção 8 de SPRINGBOOT.md, rode os testes daquela
fase antes de seguir para a próxima.
```

---

## 11. Decisões e ajustes feitos durante a implementação (2026-06-18)

Itens descobertos só na hora de implementar/testar de verdade contra um Postgres real — não estavam (ou estavam imprecisos) no plano original das seções 1–10. Registrados aqui para não se perderem.

1. **Schema dedicado por causa de um Postgres compartilhado.** O Postgres local usado neste ambiente já tinha outro projeto (`gestao_saude`) rodando no mesmo banco `la_nona`/schema `public`. Para não colidir, a API usa um schema dedicado `la_nona_api` (`spring.flyway.schemas` + `hibernate.default_schema` em `application.yml`, configurável via `DB_SCHEMA`). Isso é específico deste ambiente de desenvolvimento — em produção, normalmente seria um banco totalmente separado.
2. **`address_estado` é `VARCHAR(2)`, não `CHAR(2)`.** `CHAR(2)` faz o Postgres retornar o tipo `bpchar`, que não bate com o que o Hibernate espera por padrão para um campo `String` sem `columnDefinition` customizado (`Schema-validation: wrong column type`). Corrigido na migration e na seção 3.2.
3. **Lombok foi adicionado ao `pom.xml`** (não estava na lista de dependências original) para reduzir boilerplate de getters/setters/construtores nas entidades — dependência só de build (`scope` implícito + `optional`), sem efeito em runtime.
4. **`saveAndFlush` em vez de `save` sempre que a resposta lê um campo gerado pelo Hibernate na mesma transação.** `@CreationTimestamp`/`@UpdateTimestamp` só populam o valor no *flush*; um `save()` simples deixava `createdAt`/`updatedAt`/`sentAt` voltando `null` (ou desatualizado) na resposta do próprio request que criou/atualizou a linha. Afetava `AuthService.register/loginWithGoogle`, `UserService` (todas as escritas), `MenuItemService.create/update` e `ChatService.sendMessage`.
5. **Criação de `ChatThread` precisa de `saveAndFlush` antes de criar a `ChatMessage`.** Como `ChatMessage.thread` é uma FK not-null, salvar a mensagem referenciando uma thread ainda transiente (recém-criada, não persistida) falha com `TransientPropertyValueException`. A thread nova é persistida (com flush) antes de qualquer mensagem ser construída.
6. **`GlobalExceptionHandler` ganhou um handler para `ErrorResponseException`** (classe-base de `NoResourceFoundException`, `HttpRequestMethodNotSupportedException`, etc.) para preservar o status HTTP nativo do Spring (404, 405...) em vez de cair no `500` genérico do catch-all `Exception.class`.
7. **Requisição anônima em endpoint admin-only devolve `403`, não `401`.** Comportamento padrão do Spring Security: `AnonymousAuthenticationToken` é tratado como "autenticado" para fins de `authenticated()`/`@PreAuthorize`, então a negação acontece por falta de role (403), não por falta de autenticação (401). Documentado nos testes para não ser confundido com bug.
8. **Bootstrap do primeiro admin é manual, via SQL** (`UPDATE users SET role='admin' WHERE email=...` no schema `la_nona_api`, depois logar de novo para receber um token com a role atualizada) — de propósito, para não ter senha de admin hardcoded em nenhuma migration/seed.
9. **Testes de integração usam o padrão "singleton container" do Testcontainers**, não o `@Testcontainers`/`@Container` por classe. Com `@Container` por classe, o JUnit para o container no `afterAll` de cada classe de teste e sobe outro (em outra porta) na próxima — mas o `ApplicationContext` do Spring já tinha sido cacheado com a porta antiga, quebrando a conexão. A correção foi iniciar o container manualmente uma vez (bloco `static { POSTGRES.start(); }`) e nunca pará-lo, com `@ServiceConnection` cuidando apenas da configuração do datasource.
10. **Refresh token rotation**: cada chamada a `/api/auth/refresh` revoga o token usado e emite um par novo — usar o mesmo refresh token duas vezes falha com 401 na segunda vez. Mais seguro que apenas validar sem rotacionar (não estava explícito na seção 6.1, mas é a leitura natural de "capacidade de revogação").
11. **Porta 8080**: neste ambiente de desenvolvimento havia outro serviço local (`eureka-gateway`) ocupando a porta por momentos — sem relação com a API; resolvido liberando a porta antes de subir a aplicação. `SERVER_PORT` é configurável via `application.yml` se precisar trocar permanentemente.
