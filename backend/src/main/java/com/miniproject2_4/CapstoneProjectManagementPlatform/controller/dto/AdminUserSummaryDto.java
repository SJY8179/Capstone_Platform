package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

public record AdminUserSummaryDto(
        long totalUsers,
        long totalStudents,
        long totalProfessors,
        long activeUsers
) {}