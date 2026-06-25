package com.lanona.api.dto.response;

import com.lanona.api.repository.projection.UserDurationProjection;

/** Tempo de acesso agregado de um usuario (ou anonimo) num periodo. */
public record UserDurationResponse(
        String label,
        boolean anonymous,
        long totalActiveSeconds,
        long sessionCount
) {

    public static UserDurationResponse from(UserDurationProjection projection) {
        String label;
        if (projection.getAnonymous()) {
            String anonId = projection.getAnonymousId();
            String shortId = anonId != null && anonId.length() > 8 ? anonId.substring(0, 8) : anonId;
            label = "Anônimo " + shortId;
        } else {
            String name = projection.getUserName();
            label = name == null || name.isBlank() ? "Usuário" : name;
        }
        return new UserDurationResponse(
                label,
                projection.getAnonymous(),
                projection.getTotalActiveSeconds(),
                projection.getSessionCount());
    }
}
