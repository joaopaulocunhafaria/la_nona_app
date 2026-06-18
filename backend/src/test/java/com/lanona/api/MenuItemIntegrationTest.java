package com.lanona.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lanona.api.entity.Role;
import com.lanona.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MenuItemIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    private String registerAndGetToken(String email, boolean asAdmin) throws Exception {
        String response = mockMvc.perform(post("/api/auth/register").contentType("application/json")
                        .content("""
                                {"email":"%s","password":"Senha1234","name":"Test"}
                                """.formatted(email)))
                .andReturn().getResponse().getContentAsString();

        if (asAdmin) {
            var user = userRepository.findByEmail(email).orElseThrow();
            user.setRole(Role.ADMIN);
            userRepository.saveAndFlush(user);
            // o token emitido no registro carrega role=cliente; promovendo depois,
            // o teste precisa logar de novo para receber um token com role=admin.
            response = mockMvc.perform(post("/api/auth/login").contentType("application/json")
                            .content("""
                                    {"email":"%s","password":"Senha1234"}
                                    """.formatted(email)))
                    .andReturn().getResponse().getContentAsString();
        }

        return objectMapper.readTree(response).get("accessToken").asText();
    }

    @Test
    void createReadUpdateDeleteAsAdmin_andRejectAsNonAdmin() throws Exception {
        String adminToken = registerAndGetToken("menu-admin@lanona.com", true);
        String clienteToken = registerAndGetToken("menu-cliente@lanona.com", false);

        String createBody = """
                {"name":"X-Burguer","description":"Pao, carne, queijo","price":29.90,
                 "category":"hamburguer","available":true,
                 "images":[{"base64":"Zm9v","contentType":"image/jpeg"}]}
                """;

        // requisicao anonima em endpoint admin-only: Spring Security devolve
        // 403 aqui (nao 401) porque o AnonymousAuthenticationToken e' tratado
        // como "autenticado" para fins de authorization, so' falha na checagem
        // de role — mesmo comportamento observado manualmente nos testes da Fase 5.
        mockMvc.perform(post("/api/menu-items").contentType("application/json").content(createBody))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/menu-items").contentType("application/json")
                        .header("Authorization", "Bearer " + clienteToken)
                        .content(createBody))
                .andExpect(status().isForbidden());

        String created = mockMvc.perform(post("/api/menu-items").contentType("application/json")
                        .header("Authorization", "Bearer " + adminToken)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category").value("Hamburguer"))
                .andExpect(jsonPath("$.images.length()").value(1))
                .andReturn().getResponse().getContentAsString();

        String id = objectMapper.readTree(created).get("id").asText();

        mockMvc.perform(get("/api/menu-items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id));

        mockMvc.perform(get("/api/menu-items").param("category", "Pizza"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(delete("/api/menu-items/" + id).header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/menu-items/" + id))
                .andExpect(status().isNotFound());
    }

    @Test
    void createWithoutImagesIsRejected() throws Exception {
        String adminToken = registerAndGetToken("menu-admin-2@lanona.com", true);

        mockMvc.perform(post("/api/menu-items").contentType("application/json")
                        .header("Authorization", "Bearer " + adminToken)
                        .content("""
                                {"name":"Sem imagem","description":"teste","price":10,
                                 "category":"Pizza","available":true,"images":[]}
                                """))
                .andExpect(status().isBadRequest());
    }
}
