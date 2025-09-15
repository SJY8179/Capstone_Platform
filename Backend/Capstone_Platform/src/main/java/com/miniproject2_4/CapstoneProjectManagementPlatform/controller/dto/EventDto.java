package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Event;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;

import java.time.LocalDateTime;

/**
 * 응답 DTO
 * - LocalDateTime 을 항상 "yyyy-MM-dd'T'HH:mm:ss" 로 직렬화하여
 *   FE 파싱 안정성 확보(마이크로초/타임존 변동 제거).
 */
public record EventDto(
        Long id,
        Long projectId,
        String title,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime startAt,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
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