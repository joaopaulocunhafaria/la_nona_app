CREATE TABLE menu_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price       NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    category    VARCHAR(30) NOT NULL
                    CHECK (category IN (
                        'Hamburguer', 'Pizza', 'Salada', 'Bebida',
                        'Sobremesa', 'Acompanhamento', 'Outro'
                    )),
    available   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_category ON menu_items (category);
CREATE INDEX idx_menu_items_available ON menu_items (available);
