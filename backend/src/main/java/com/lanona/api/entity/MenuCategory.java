package com.lanona.api.entity;

public enum MenuCategory {
    HAMBURGUER,
    PIZZA,
    SALADA,
    BEBIDA,
    SOBREMESA,
    ACOMPANHAMENTO,
    OUTRO;

    /**
     * Nome de exibicao usado tanto na API quanto na coluna do banco:
     * primeira letra maiuscula, restante minusculo (ex.: "Hamburguer").
     */
    public String displayName() {
        String lower = name().toLowerCase();
        return lower.substring(0, 1).toUpperCase() + lower.substring(1);
    }
}
