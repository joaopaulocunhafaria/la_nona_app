package com.lanona.api.dto.response;

import com.lanona.api.repository.projection.TimeBucketProjection;

import java.time.Instant;

/** Ponto de serie temporal: inicio do intervalo e contagem. */
public record TimeBucketResponse(
        Instant bucket,
        long count
) {

    public static TimeBucketResponse from(TimeBucketProjection projection) {
        return new TimeBucketResponse(projection.getBucket(), projection.getCount());
    }
}
