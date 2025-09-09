package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import jakarta.validation.constraints.NotBlank;

public class AssignmentRequests {

    public record Create(
            @NotBlank String title,
            // "yyyy-MM-dd'T'HH:mm:ss" 혹은 "yyyy-MM-dd" (시간 없으면 23:59 로 보정)
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
