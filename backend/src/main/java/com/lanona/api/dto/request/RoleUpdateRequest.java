package com.lanona.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RoleUpdateRequest(
        @NotBlank(message = "role é obrigatório")
        String role
) {
}
