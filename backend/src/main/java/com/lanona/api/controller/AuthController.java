package com.lanona.api.controller;

import com.lanona.api.dto.request.GoogleLoginRequest;
import com.lanona.api.dto.request.LoginRequest;
import com.lanona.api.dto.request.RefreshTokenRequest;
import com.lanona.api.dto.request.RegisterRequest;
import com.lanona.api.dto.response.AuthResponse;
import com.lanona.api.entity.Platform;
import com.lanona.api.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request,
            @RequestHeader(value = "X-Client-Platform", required = false) String platform) {
        return authService.register(request, Platform.fromNullable(platform));
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "X-Client-Platform", required = false) String platform) {
        return authService.login(request, Platform.fromNullable(platform));
    }

    @PostMapping("/google")
    public AuthResponse google(
            @Valid @RequestBody GoogleLoginRequest request,
            @RequestHeader(value = "X-Client-Platform", required = false) String platform) {
        return authService.loginWithGoogle(request, Platform.fromNullable(platform));
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request);
    }
}
