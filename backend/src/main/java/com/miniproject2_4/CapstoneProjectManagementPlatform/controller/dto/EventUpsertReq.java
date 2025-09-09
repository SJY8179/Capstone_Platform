package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record EventUpsertReq(
        @NotBlank String title,
        @NotNull EventType type,          // MEETING | DEADLINE | ETC
        @NotNull LocalDateTime startAt,
        LocalDateTime endAt,
        String location
) {}
