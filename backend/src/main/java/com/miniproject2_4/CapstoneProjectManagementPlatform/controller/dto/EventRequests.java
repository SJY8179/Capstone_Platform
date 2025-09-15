package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;
import jakarta.validation.constraints.NotBlank;

public class EventRequests {
    public record Create(
            @NotBlank String title,
            String startAtIso,     // "yyyy-MM-dd'T'HH:mm:ss"
            String endAtIso,
            EventType type,        // MEETING/DEADLINE/ETC
            String location
    ) {}
    public record Update(
            String title,
            String startAtIso,
            String endAtIso,
            EventType type,
            String location
    ) {}
}
