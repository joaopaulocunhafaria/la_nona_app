package com.lanona.api.controller;

import com.lanona.api.dto.request.AddressRequest;
import com.lanona.api.dto.request.PhotoRequest;
import com.lanona.api.dto.response.UserResponse;
import com.lanona.api.security.UserPrincipal;
import com.lanona.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return userService.getById(principal.getId());
    }

    @PutMapping("/me/address")
    public UserResponse updateAddress(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody AddressRequest request) {
        return userService.saveAddress(principal.getId(), request);
    }

    @PutMapping("/me/photo")
    public UserResponse updatePhoto(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PhotoRequest request) {
        return userService.updatePhoto(principal.getId(), request);
    }
}
