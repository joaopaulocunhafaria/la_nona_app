package com.lanona.api.dto.response;

import java.util.List;

/** Tempo de acesso no periodo: media por sessao e ranking por usuario. */
public record SessionDurationResponse(
        double avgActiveSeconds,
        long totalSessions,
        List<UserDurationResponse> ranking
) {
}
