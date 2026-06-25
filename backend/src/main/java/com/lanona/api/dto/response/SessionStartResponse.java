package com.lanona.api.dto.response;

import java.util.UUID;

public record SessionStartResponse(
        UUID sessionId
) {
}
