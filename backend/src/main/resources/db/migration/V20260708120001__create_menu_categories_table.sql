-- Categorias de cardapio agora sao dinamicas (cadastraveis pelo admin) em vez
-- de um enum fixo. Esta migration cria a tabela, semeia as categorias que ja
-- existiam como enum e converte menu_items.category (displayName) numa FK.

CREATE TABLE menu_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(60) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_menu_categories_name UNIQUE (name)
);

-- Semeia com as categorias fixas antigas, preservando os itens ja cadastrados
-- (menu_items.category guardava exatamente esses displayNames).
INSERT INTO menu_categories (name) VALUES
    ('Hamburguer'), ('Pizza'), ('Salada'), ('Bebida'),
    ('Sobremesa'), ('Acompanhamento'), ('Outro');

-- Nova coluna FK; backfill a partir do displayName atual.
ALTER TABLE menu_items ADD COLUMN category_id UUID;

UPDATE menu_items mi
SET category_id = mc.id
FROM menu_categories mc
WHERE mc.name = mi.category;

ALTER TABLE menu_items
    ALTER COLUMN category_id SET NOT NULL,
    ADD CONSTRAINT fk_menu_items_category
        FOREIGN KEY (category_id) REFERENCES menu_categories (id);

-- Remove a antiga coluna enum (com seu CHECK) e respectivo indice.
DROP INDEX IF EXISTS idx_menu_items_category;
ALTER TABLE menu_items DROP COLUMN category;

CREATE INDEX idx_menu_items_category_id ON menu_items (category_id);
