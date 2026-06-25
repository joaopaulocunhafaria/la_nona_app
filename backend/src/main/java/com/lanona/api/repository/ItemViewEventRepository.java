package com.lanona.api.repository;

import com.lanona.api.entity.ItemViewEvent;
import com.lanona.api.repository.projection.TopItemProjection;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ItemViewEventRepository extends JpaRepository<ItemViewEvent, UUID> {

    /**
     * Itens mais visualizados no periodo, do maior numero de visualizacoes para
     * o menor. Limite controlado pelo Pageable.
     */
    @Query("""
            SELECT e.menuItem.id AS menuItemId, e.menuItem.name AS name, COUNT(e) AS views
            FROM ItemViewEvent e
            WHERE e.createdAt BETWEEN :from AND :to
            GROUP BY e.menuItem.id, e.menuItem.name
            ORDER BY COUNT(e) DESC
            """)
    List<TopItemProjection> topViewedItems(
            @Param("from") Instant from, @Param("to") Instant to, Pageable pageable);
}
