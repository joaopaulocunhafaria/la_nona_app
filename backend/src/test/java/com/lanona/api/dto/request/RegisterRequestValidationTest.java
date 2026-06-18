package com.lanona.api.dto.request;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Validacao de senha (minimo 8 caracteres) e email, conforme a mesma regra
 * do AuthService.registrar() do app Flutter. Teste puro de Bean Validation,
 * sem subir contexto Spring.
 */
class RegisterRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void rejectsPasswordShorterThan8Characters() {
        var request = new RegisterRequest("user@lanona.com", "1234567", "Nome");

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        assertThat(violations).anySatisfy(v ->
                assertThat(v.getPropertyPath().toString()).isEqualTo("password"));
    }

    @Test
    void acceptsPasswordWith8Characters() {
        var request = new RegisterRequest("user@lanona.com", "12345678", "Nome");

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        assertThat(violations).isEmpty();
    }

    @Test
    void rejectsInvalidEmail() {
        var request = new RegisterRequest("nao-e-email", "12345678", "Nome");

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        assertThat(violations).anySatisfy(v ->
                assertThat(v.getPropertyPath().toString()).isEqualTo("email"));
    }

    @Test
    void rejectsBlankPassword() {
        var request = new RegisterRequest("user@lanona.com", "", "Nome");

        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);

        assertThat(violations).isNotEmpty();
    }
}
