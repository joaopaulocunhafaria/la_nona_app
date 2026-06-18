CREATE TABLE menu_item_images (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id  UUID NOT NULL REFERENCES menu_items (id) ON DELETE CASCADE,
    image_data    TEXT NOT NULL,
    position      INT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_item_images_menu_item_id ON menu_item_images (menu_item_id);
