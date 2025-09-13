package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

public record ProjectOverviewDto(
        String markdown,
        String status,      // PUBLISHED | PENDING
        int version,
        String updatedAt,   // ISO
        SimpleUser updatedBy,
        String pendingMarkdown,
        SimpleUser pendingAuthor,
        String pendingAt    // ISO
) {
    public record SimpleUser(Long id, String name) {}
}
