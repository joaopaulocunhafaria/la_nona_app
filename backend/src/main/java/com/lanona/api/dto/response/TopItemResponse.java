package com.lanona.api.dto.response;

import com.lanona.api.repository.projection.TopItemProjection;

import java.util.UUID;

/** Item do cardapio e numero de visualizacoes de detalhe no periodo. */
public record TopItemResponse(
        UUID menuItemId,
        String name,
        long views
) {

    public static TopItemResponse from(TopItemProjection projection) {
        return new TopItemResponse(projection.getMenuItemId(), projection.getName(), projection.getViews());
    }
}
