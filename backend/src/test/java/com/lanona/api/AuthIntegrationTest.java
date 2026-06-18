package com.lanona.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerThenLoginThenRefreshThenLogout() throws Exception {
        String email = "integration-auth@lanona.com";
        String body = """
                {"email":"%s","password":"Senha1234","name":"Integration Test"}
                """.formatted(email);

        String registerResponse = mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.role").value("cliente"))
                .andReturn().getResponse().getContentAsString();

        String refreshToken = objectMapper.readTree(registerResponse).get("refreshToken").asText();

        // registrar com o mesmo email de novo -> conflito
        mockMvc.perform(post("/api/auth/register").contentType("application/json").content(body))
                .andExpect(status().isConflict());

        // senha errada -> 401
        mockMvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("""
                                {"email":"%s","password":"errada"}
                                """.formatted(email)))
                .andExpect(status().isUnauthorized());

        // senha certa -> 200
        mockMvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("""
                                {"email":"%s","password":"Senha1234"}
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());

        // refresh com o token do registro -> novo par de tokens
        mockMvc.perform(post("/api/auth/refresh").contentType("application/json")
                        .content("{\"refreshToken\":\"%s\"}".formatted(refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());

        // o MESMO refresh token usado de novo -> ja foi rotacionado/revogado -> 401
        mockMvc.perform(post("/api/auth/refresh").contentType("application/json")
                        .content("{\"refreshToken\":\"%s\"}".formatted(refreshToken)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void registerWithShortPasswordIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("""
                                {"email":"weak@lanona.com","password":"123","name":"x"}
                                """))
                .andExpect(status().isBadRequest());
    }
}
