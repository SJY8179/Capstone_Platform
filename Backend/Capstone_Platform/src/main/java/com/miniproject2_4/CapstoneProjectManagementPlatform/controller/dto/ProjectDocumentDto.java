package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

public record ProjectDocumentDto(
        Long id,
        Long projectId,
        String title,
        String url,
        String type,
        String createdAt,
        SimpleUser createdBy
) {
    public record SimpleUser(Long id, String name) {}
}