package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;

import java.time.LocalDateTime;

public record AdminUserDto(
        Long id,
        String name,
        String email,
        Role role,
        String avatarUrl,
        LocalDateTime createdAt,
        LocalDateTime lastLoginAt,
        boolean active,
        String currentProjectTitle,   // 학생이라면 최근 프로젝트
        Integer taughtProjectCount    // 교수라면 담당 프로젝트 수
) {}