package com.lanona.api.repository;

import com.lanona.api.entity.LoginEvent;
import com.lanona.api.repository.projection.TimeBucketProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface LoginEventRepository extends JpaRepository<LoginEvent, UUID> {

    /** Total de logins no periodo. */
    long countByCreatedAtBetween(Instant from, Instant to);

    /** Usuarios distintos que logaram no periodo. */
    @Query("""
            SELECT COUNT(DISTINCT e.user.id)
            FROM LoginEvent e
            WHERE e.createdAt BETWEEN :from AND :to
            """)
    long countDistinctUsers(@Param("from") Instant from, @Param("to") Instant to);

    /**
     * Serie temporal de logins agrupada por hora ou dia. :granularity deve ser
     * um valor aceito por date_trunc do Postgres ('hour' ou 'day').
     */
    @Query(value = """
            SELECT date_trunc(:granularity, created_at) AS bucket, COUNT(*) AS count
            FROM login_events
            WHERE created_at BETWEEN :from AND :to
            GROUP BY bucket
            ORDER BY bucket
            """, nativeQuery = true)
    List<TimeBucketProjection> loginsOverTime(
            @Param("granularity") String granularity,
            @Param("from") Instant from,
            @Param("to") Instant to);
}
