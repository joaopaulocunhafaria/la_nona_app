package com.lanona.api.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PhotoRequest(
        @NotBlank(message = "imageBase64 é obrigatório")
        String imageBase64,

        @NotBlank(message = "contentType é obrigatório")
        String contentType
) {
}
