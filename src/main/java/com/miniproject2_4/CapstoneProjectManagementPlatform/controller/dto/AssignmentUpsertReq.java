package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record AssignmentUpsertReq(
        @NotBlank String title,
        LocalDateTime dueDate,
        @NotNull AssignmentStatus status // PENDING | ONGOING | COMPLETED
) {}
