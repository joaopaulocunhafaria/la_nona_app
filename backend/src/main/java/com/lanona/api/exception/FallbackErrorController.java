package com.lanona.api.exception;

import com.lanona.api.dto.response.ErrorResponse;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Substitui o BasicErrorController padrao do Spring Boot, que expoe "path" e "status" cru no
 * corpo da resposta. Qualquer falha que escape do GlobalExceptionHandler (fora do ciclo normal
 * do MVC) cai aqui e recebe o mesmo formato de erro amigavel usado no resto da API.
 */
@RestController
public class FallbackErrorController implements ErrorController {

    @RequestMapping("/error")
    public ResponseEntity<ErrorResponse> handleError(HttpServletRequest request) {
        Object statusAttribute = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        HttpStatus status = statusAttribute != null
                ? HttpStatus.valueOf(Integer.parseInt(statusAttribute.toString()))
                : HttpStatus.INTERNAL_SERVER_ERROR;

        String mensagem = status == HttpStatus.NOT_FOUND
                ? "Recurso não encontrado."
                : "Ocorreu um erro inesperado.";

        return ResponseEntity.status(status).body(ErrorResponse.of(status.value(), mensagem));
    }
}
