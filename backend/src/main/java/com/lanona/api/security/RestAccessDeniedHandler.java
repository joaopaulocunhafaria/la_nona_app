package com.lanona.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lanona.api.dto.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Substitui o access denied handler padrao do Spring Security (que devolve corpo vazio) para que
 * negacoes de acesso por regra de rota (ex.: hasRole em /api/admin/**) tambem recebam o mesmo
 * formato de erro amigavel da API, em vez de uma resposta 403 sem corpo.
 */
@Component
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
            throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse body = ErrorResponse.of(HttpStatus.FORBIDDEN.value(), "Acesso negado.");
        objectMapper.writeValue(response.getWriter(), body);
    }
}
