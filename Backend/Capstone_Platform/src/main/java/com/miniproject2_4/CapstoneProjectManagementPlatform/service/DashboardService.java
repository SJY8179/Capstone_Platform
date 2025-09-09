package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Assignment;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final AssignmentRepository assignmentRepository;
    private final TeamMemberRepository teamMemberRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /* ========= DTO ========= */
    public record Summary(
            int progressPct,                 // 진행률 %
            int memberCount,                 // 팀원 수
            int commitsThisWeek,             // 이번 주 커밋 수(데이터 없으면 0)
            Assignments assignments,         // {open,inProgress,closed}
            Milestone milestone              // 다음 마일스톤(없으면 null)
    ) {
        public record Assignments(int open, int inProgress, int closed) { }
        public record Milestone(String title, String date) { }
    }

    public record Status(
            int progressPct,
            String lastUpdate,
            List<String> actions
    ) { }

    public record DeadlineItem(
            String title,
            String dueDate
    ) { }

    /* ========= Queries ========= */

    public Summary getSummary(Long projectId) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        // 팀원 수
        Long teamId = p.getTeam() != null ? p.getTeam().getId() : null;
        int memberCount = (teamId == null) ? 0 : (int) teamMemberRepository.countByTeam_Id(teamId);

        // 과제 집계
        List<Assignment> assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId);
        int total = assigns.size();
        int closed = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
        int inProgress = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.ONGOING).count();
        int open = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.PENDING).count();
        int progressPct = total == 0 ? 0 : (int) Math.round(closed * 100.0 / total);

        // 다음 마일스톤
        LocalDateTime now = LocalDateTime.now();
        Assignment next = assigns.stream()
                .filter(a -> a.getDueDate() != null && !a.getDueDate().isBefore(now))
                .min(Comparator.comparing(Assignment::getDueDate))
                .orElse(null);

        Summary.Milestone milestone = (next == null)
                ? null
                : new Summary.Milestone(next.getTitle(), next.getDueDate().format(ISO));

        // 커밋 수는 지금은 0으로(추후 GitHub 연동 시 대체)
        int commitsThisWeek = 0;

        return new Summary(
                progressPct,
                memberCount,
                commitsThisWeek,
                new Summary.Assignments(open, inProgress, closed),
                milestone
        );
    }

    public Status getStatus(Long projectId) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        int progressPct = getSummary(projectId).progressPct();
        String lastUpdate = (p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt()).format(ISO);

        // 간단 가이드 액션(임시)
        List<String> actions = List.of(
                "다음 마일스톤 준비",
                "팀 회의 일정 확정",
                "중간 보고서 점검"
        );

        return new Status(progressPct, lastUpdate, actions);
    }

    public List<DeadlineItem> getDeadlines(Long projectId, int limit) {
        List<Assignment> assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId);
        LocalDateTime now = LocalDateTime.now();
        return assigns.stream()
                .filter(a -> a.getDueDate() != null && !a.getDueDate().isBefore(now))
                .sorted(Comparator.comparing(Assignment::getDueDate))
                .limit(limit)
                .map(a -> new DeadlineItem(a.getTitle(), a.getDueDate().format(ISO)))
                .toList();
    }
}
