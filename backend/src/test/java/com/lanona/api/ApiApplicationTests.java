package com.lanona.api;

import org.junit.jupiter.api.Test;

/**
 * Smoke test: o contexto Spring sobe corretamente contra um Postgres real
 * (Testcontainers), sem precisar de nenhum banco local configurado a mao.
 */
class ApiApplicationTests extends AbstractIntegrationTest {

    @Test
    void contextLoads() {
    }
}
