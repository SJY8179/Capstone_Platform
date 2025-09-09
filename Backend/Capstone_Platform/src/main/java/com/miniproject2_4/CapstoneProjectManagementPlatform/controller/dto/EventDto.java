package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Event;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;

import java.time.LocalDateTime;

public record EventDto(
        Long id,
        Long projectId,
        String title,
        LocalDateTime startAt,
        LocalDateTime endAt,
        String location,
        EventType type
) {
    public static EventDto from(Event e) {
        return new EventDto(
                e.getId(),
                e.getProject().getId(),
                e.getTitle(),
                e.getStartAt(),
                e.getEndAt(),
                e.getLocation(),
                e.getType()
        );
    }
}
