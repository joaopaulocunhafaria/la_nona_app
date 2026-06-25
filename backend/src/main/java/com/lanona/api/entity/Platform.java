package com.lanona.api.entity;

/**
 * Plataforma de origem de um evento de telemetria. Web (Angular) ou mobile
 * (Flutter). Usada para segmentar metricas de uso.
 */
public enum Platform {
    WEB,
    MOBILE;

    /**
     * Converte um valor recebido do cliente para o enum, com fallback seguro
     * para WEB quando ausente ou desconhecido (telemetria nunca deve quebrar
     * o fluxo principal por causa de um valor invalido).
     */
    public static Platform fromNullable(String value) {
        if (value == null) {
            return WEB;
        }
        try {
            return Platform.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return WEB;
        }
    }
}
