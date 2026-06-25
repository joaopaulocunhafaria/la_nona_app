package com.lanona.api.repository.projection;

import java.time.Instant;

/** Ponto de uma serie temporal: inicio do intervalo e contagem no intervalo. */
public interface TimeBucketProjection {
    Instant getBucket();

    long getCount();
}
