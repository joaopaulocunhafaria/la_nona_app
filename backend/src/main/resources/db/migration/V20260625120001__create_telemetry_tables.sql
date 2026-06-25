-- Sessoes de telemetria: uma por abertura do app (web/mobile). Identifica
-- anonimos por anonymous_id (gerado no cliente) e associa user_id quando logado.
CREATE TABLE telemetry_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users (id) ON DELETE SET NULL,
    anonymous_id    VARCHAR(64) NOT NULL,
    platform        VARCHAR(16) NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    active_seconds  BIGINT NOT NULL DEFAULT 0,
    ended_at        TIMESTAMPTZ
);

CREATE INDEX idx_telemetry_sessions_online ON telemetry_sessions (ended_at, last_seen_at);
CREATE INDEX idx_telemetry_sessions_user_id ON telemetry_sessions (user_id);
CREATE INDEX idx_telemetry_sessions_started_at ON telemetry_sessions (started_at);

-- Eventos de login: registrados no backend a cada autenticacao bem-sucedida.
CREATE TABLE login_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    platform    VARCHAR(16),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_events_created_at ON login_events (created_at);
CREATE INDEX idx_login_events_user_id ON login_events (user_id);

-- Visualizacoes de detalhe de item do cardapio (logados e anonimos).
CREATE TABLE item_view_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id  UUID NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
    user_id       UUID REFERENCES users (id) ON DELETE SET NULL,
    anonymous_id  VARCHAR(64),
    platform      VARCHAR(16),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_view_events_menu_item_id ON item_view_events (menu_item_id);
CREATE INDEX idx_item_view_events_created_at ON item_view_events (created_at);
