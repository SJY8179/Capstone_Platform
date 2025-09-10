package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record ProfessorSummaryDto(
        Metrics metrics,
        List<PendingReviewItem> pendingReviews,
        List<RecentSubmission> recentSubmissions,
        List<TopTeam> topTeams
) {
    public record Metrics(
            int runningTeams,
            int pendingReviews,
            int courses,          // 담당 과목 수(또는 프로젝트 묶음 수)
            double avgProgress, // 0~100
            int studentCount
    ) {}

    public record PendingReviewItem(
            Long assignmentId,
            Long projectId,
            String projectName,
            String teamName,
            String title,
            OffsetDateTime submittedAt
    ) {}

    public record RecentSubmission(
            Long assignmentId,
            Long projectId,
            String projectName,
            String teamName,
            String title,
            OffsetDateTime submittedAt,
            String status
    ) {}

    public record TopTeam(
            Long teamId,
            String teamName,
            Long projectId,
            String projectName,
            double progress // 0~100
    ) {}
}
