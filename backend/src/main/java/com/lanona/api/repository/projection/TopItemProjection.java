package com.lanona.api.repository.projection;

import java.util.UUID;

/** Item do cardapio e quantas vezes seu detalhe foi visualizado. */
public interface TopItemProjection {
    UUID getMenuItemId();

    String getName();

    long getViews();
}
