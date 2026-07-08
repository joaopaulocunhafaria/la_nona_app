package com.lanona.api.dto.response;

import com.lanona.api.entity.MenuCategory;

import java.time.Instant;
import java.util.UUID;

public record MenuCategoryResponse(
        UUID id,
        String name,
        long itemCount,
        Instant createdAt,
        Instant updatedAt
) {

    public static MenuCategoryResponse from(MenuCategory category, long itemCount) {
        return new MenuCategoryResponse(
                category.getId(),
                category.getName(),
                itemCount,
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}
