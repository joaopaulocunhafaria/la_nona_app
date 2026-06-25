package com.lanona.api.repository.projection;

/** Tempo de acesso agregado por usuario (ou por anonimo) num periodo. */
public interface UserDurationProjection {
    String getUserName();

    String getAnonymousId();

    boolean getAnonymous();

    long getTotalActiveSeconds();

    long getSessionCount();
}
