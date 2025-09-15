package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

public record RiskDto(
        Long id,
        Long projectId,
        String title,
        int impact,
        int likelihood,
        String mitigation,
        String owner,
        String dueDate,   // ISO
        String status,
        String updatedAt  // ISO
) {}