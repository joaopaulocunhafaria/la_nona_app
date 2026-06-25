package com.lanona.api.dto.response;

import java.util.List;

/** Metricas de login num periodo: total, usuarios distintos e serie temporal. */
public record LoginMetricsResponse(
        long total,
        long distinctUsers,
        List<TimeBucketResponse> series
) {
}
