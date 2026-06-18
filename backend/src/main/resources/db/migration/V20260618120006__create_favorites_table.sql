CREATE TABLE favorites (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    menu_item_id  UUID NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, menu_item_id)
);

CREATE INDEX idx_favorites_user_id ON favorites (user_id);
