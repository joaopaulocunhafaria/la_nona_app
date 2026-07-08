package com.lanona.api.repository;

import com.lanona.api.entity.MenuCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MenuCategoryRepository extends JpaRepository<MenuCategory, UUID> {

    Optional<MenuCategory> findByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCase(String name);

    List<MenuCategory> findAllByOrderByNameAsc();
}
