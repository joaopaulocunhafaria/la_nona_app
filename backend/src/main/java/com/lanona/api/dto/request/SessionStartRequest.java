package com.lanona.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SessionStartRequest(
        @NotBlank(message = "Identificador da sessão é obrigatório")
        String anonymousId,

        String platform
) {
}
