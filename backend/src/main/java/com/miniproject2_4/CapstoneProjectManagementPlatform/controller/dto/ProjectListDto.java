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
    /** 목록 카드에 노출되는 팀 멤버 요약 + 전역 역할 */
    public record Member(Long id, String name, String userRole) {}
    public record Milestones(int completed, int total) {}
    public record NextDeadline(String task, String date) {}
}
