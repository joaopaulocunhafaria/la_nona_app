package com.lanona.api.service;

import com.lanona.api.dto.request.MenuCategoryRequest;
import com.lanona.api.dto.response.MenuCategoryResponse;
import com.lanona.api.entity.MenuCategory;
import com.lanona.api.exception.ConflictException;
import com.lanona.api.exception.ResourceNotFoundException;
import com.lanona.api.repository.MenuCategoryRepository;
import com.lanona.api.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MenuCategoryService {

    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;

    @Transactional(readOnly = true)
    public List<MenuCategoryResponse> list() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(category -> MenuCategoryResponse.from(category, menuItemRepository.countByCategoryId(category.getId())))
                .toList();
    }

    @Transactional
    public MenuCategoryResponse create(MenuCategoryRequest request) {
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("Já existe uma categoria com esse nome.");
        }
        MenuCategory saved = categoryRepository.saveAndFlush(MenuCategory.builder().name(name).build());
        return MenuCategoryResponse.from(saved, 0);
    }

    @Transactional
    public void delete(UUID id) {
        MenuCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada."));

        // Regra de negocio: uma categoria com itens vinculados nao pode ser removida.
        if (menuItemRepository.countByCategoryId(id) > 0) {
            throw new ConflictException(
                    "Não é possível excluir uma categoria com itens vinculados. Remova ou altere os itens primeiro.");
        }

        categoryRepository.delete(category);
    }
}
