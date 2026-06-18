package com.lanona.api.controller;

import com.lanona.api.dto.request.RoleUpdateRequest;
import com.lanona.api.dto.response.UserResponse;
import com.lanona.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public List<UserResponse> list(@RequestParam(required = false) String search) {
        return userService.search(search);
    }

    @PutMapping("/{id}/role")
    public UserResponse updateRole(@PathVariable UUID id, @Valid @RequestBody RoleUpdateRequest request) {
        return userService.updateRole(id, request);
    }
}
