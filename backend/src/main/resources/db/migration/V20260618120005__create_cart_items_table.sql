CREATE TABLE cart_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    menu_item_id  UUID NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
    quantity      INT NOT NULL CHECK (quantity > 0),
    added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, menu_item_id)
);

CREATE INDEX idx_cart_items_user_id ON cart_items (user_id);
