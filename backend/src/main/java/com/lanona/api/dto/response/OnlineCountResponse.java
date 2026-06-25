package com.lanona.api.dto.response;

/** Usuarios online no momento: logados e anonimos. */
public record OnlineCountResponse(
        long loggedIn,
        long anonymous
) {
}
