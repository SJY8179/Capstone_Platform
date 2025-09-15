package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

public record DecisionDto(
        Long id,
        Long projectId,
        String title,
        String context,
        String options,
        String decision,
        String consequences,
        String decidedAt,        // ISO
        SimpleUser decidedBy,
        String createdAt         // ISO
) {
    public record SimpleUser(Long id, String name) {}
}