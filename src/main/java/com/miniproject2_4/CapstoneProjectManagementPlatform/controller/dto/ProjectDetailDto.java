package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import java.util.List;

/** 프로젝트 상세 화면용 DTO (스키마) */
public record ProjectDetailDto(
        Long id,
        String title,
        String status,                 // 'in-progress' | 'review' | 'completed' | 'planning'
        BasicTeam team,
        BasicUser professor,           // null 허용
        RepoInfo repo,                 // null 허용
        String createdAt,              // ISO_LOCAL_DATE_TIME
        String updatedAt,              // ISO_LOCAL_DATE_TIME
        int progress,                  // 0~100 (Assignment 기반)
        TaskSummary taskSummary,
        List<TaskItem> tasks,          // 최신 DueDate 순 정렬
        List<EventItem> upcomingEvents,// 가까운 일정 (시작일 오름차순)
        List<ResourceLink> links       // 외부 링크 (예: GitHub)
) {
    public record BasicTeam(Long id, String name) {}
    public record BasicUser(Long id, String name, String email) {}
    public record RepoInfo(String owner, String name, String url) {}
    public record TaskSummary(int total, int completed, int ongoing, int pending) {}
    public record TaskItem(Long id, String title, String status, String dueDate) {}
    public record EventItem(Long id, String title, String type, String startAt, String endAt, String location) {}
    public record ResourceLink(String label, String url) {}
}
