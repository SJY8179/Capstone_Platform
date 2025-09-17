package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import jakarta.validation.constraints.NotBlank;

public class AssignmentRequests {

    public record Create(
            @NotBlank String title,
            // "yyyy-MM-dd'T'HH:mm:ss" 혹은 "yyyy-MM-dd"
            // 서비스에서 날짜만 오면 23:59로 보정, null/blank면 +7일 23:59 기본값
            String dueDateIso,
            AssignmentStatus status // null -> PENDING
    ) {}

    public record Update(
            String title,
            String dueDateIso,
            AssignmentStatus status
    ) {}

    public record UpdateStatus(
            AssignmentStatus status
    ) {}
}