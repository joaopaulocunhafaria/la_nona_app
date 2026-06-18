CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                 VARCHAR(255) NOT NULL UNIQUE,
    password_hash         VARCHAR(255),
    name                  VARCHAR(255) NOT NULL DEFAULT '',
    photo                 TEXT,
    provider              VARCHAR(20) NOT NULL DEFAULT 'local'
                              CHECK (provider IN ('local', 'google')),
    role                  VARCHAR(20) NOT NULL DEFAULT 'cliente'
                              CHECK (role IN ('cliente', 'entregador', 'admin')),
    onboarding_completed  BOOLEAN NOT NULL DEFAULT false,
    address_cep           VARCHAR(9),
    address_rua           VARCHAR(255),
    address_bairro        VARCHAR(255),
    address_numero        VARCHAR(10),
    address_cidade        VARCHAR(255),
    address_estado        VARCHAR(2),
    address_complemento   VARCHAR(60),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
