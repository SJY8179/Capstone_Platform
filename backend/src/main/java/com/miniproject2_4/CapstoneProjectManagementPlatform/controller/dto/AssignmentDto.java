package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Assignment;

import java.time.LocalDateTime;

public class AssignmentDto {
    public Long id;
    public Long projectId;
    public String title;
    public LocalDateTime dueDate;
    public String status; // AssignmentStatus.name()

    public static AssignmentDto of(Assignment a) {
        var dto = new AssignmentDto();
        dto.id = a.getId();
        dto.projectId = (a.getProject() != null ? a.getProject().getId() : null);
        dto.title = a.getTitle();
        dto.dueDate = a.getDueDate();
        dto.status = (a.getStatus() != null ? a.getStatus().name() : null);
        return dto;
    }
}
