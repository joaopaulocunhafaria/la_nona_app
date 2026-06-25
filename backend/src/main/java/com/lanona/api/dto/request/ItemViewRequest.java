package com.lanona.api.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ItemViewRequest(
        @NotNull(message = "Item é obrigatório")
        UUID menuItemId,

        String anonymousId,

        String platform
) {
}
