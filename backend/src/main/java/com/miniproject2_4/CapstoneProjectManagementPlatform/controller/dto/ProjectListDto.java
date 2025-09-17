package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import java.util.List;

public record ProjectListDto(
        Long id,
        String name,
        String description,
        String status,                 // 'in-progress' | 'review' | 'completed' | 'planning'
        String team,
        String lastUpdate,             // ISO_LOCAL_DATE_TIME
        int progress,                  // 0~100
        List<Member> members,
        Milestones milestones,
        NextDeadline nextDeadline      // null 허용
) {
    public record Member(Long id, String name) {}
    public record Milestones(int completed, int total) {}
    public record NextDeadline(String task, String date) {}
}