package com.lanona.api.dto.request;

public record AddressRequest(
        String cep,
        String rua,
        String bairro,
        String numero,
        String cidade,
        String estado,
        String complemento
) {
}
