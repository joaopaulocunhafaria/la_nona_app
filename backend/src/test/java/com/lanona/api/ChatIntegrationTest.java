package com.lanona.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cobre os endpoints REST do chat (threads, historico, mark-as-read) e a
 * RBAC entre cliente/admin. O transporte em tempo real (WebSocket/STOMP) foi
 * validado manualmente ponta a ponta (handshake autenticado, envio,
 * broadcast) e nao e' reexercitado aqui.
 */
class ChatIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String registerAndLogin(String email) throws Exception {
        String response = mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("{\"email\":\"%s\",\"password\":\"Senha1234\",\"name\":\"Test\"}".formatted(email)))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("accessToken").asText();
    }

    @Test
    void clienteCannotListThreadsOrReadOthersMessages() throws Exception {
        String clienteToken = registerAndLogin("chat-cliente@lanona.com");

        mockMvc.perform(get("/api/chat/threads").header("Authorization", "Bearer " + clienteToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/chat/threads/unread-count").header("Authorization", "Bearer " + clienteToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/chat/my-thread/unread-count").header("Authorization", "Bearer " + clienteToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(0));

        String someoneElseId = "00000000-0000-0000-0000-000000000000";
        mockMvc.perform(get("/api/chat/threads/" + someoneElseId + "/messages")
                        .header("Authorization", "Bearer " + clienteToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/chat/threads/" + someoneElseId + "/read")
                        .param("as", "user")
                        .header("Authorization", "Bearer " + clienteToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void clienteCanReadOwnEmptyThread() throws Exception {
        String response = mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("""
                                {"email":"chat-cliente-2@lanona.com","password":"Senha1234","name":"Test"}
                                """))
                .andReturn().getResponse().getContentAsString();

        var json = objectMapper.readTree(response);
        String token = json.get("accessToken").asText();
        String userId = json.get("user").get("id").asText();

        mockMvc.perform(get("/api/chat/threads/" + userId + "/messages")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(0));

        // ainda nao existe thread (nenhuma mensagem foi enviada) -> 404 ao marcar como lida
        mockMvc.perform(put("/api/chat/threads/" + userId + "/read")
                        .param("as", "user")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}
