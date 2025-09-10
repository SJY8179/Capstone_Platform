package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProfessorSummaryDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final TeamMemberRepository teamMemberRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /* ========= DTO ========= */
    public record Summary(
            int progressPct,
            int memberCount,
            int commitsThisWeek,
            Assignments assignments,
            Milestone milestone
    ) {
        public record Assignments(int open, int inProgress, int closed) {}
        public record Milestone(String title, String date) {}
    }

    public record Status(int progressPct, String lastUpdate, List<String> actions) {}
    public record DeadlineItem(String title, String dueDate) {}

    /* ========= 기존 Project 단위 대시보드 ========= */
    public Summary getSummary(Long projectId) {
        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        Long teamId = (p.getTeam() != null ? p.getTeam().getId() : null);
        int memberCount = (teamId == null) ? 0 : (int) teamMemberRepository.countByTeam_Id(teamId);

        var assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId);
        int total = assigns.size();
        int closed = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
        int inProgress = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.ONGOING).count();
        int open = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.PENDING).count();
        int progressPct = total == 0 ? 0 : (int) Math.round(closed * 100.0 / total);

        var now = LocalDateTime.now();
        var next = assigns.stream()
                .filter(a -> a.getDueDate() != null && !a.getDueDate().isBefore(now))
                .min(Comparator.comparing(Assignment::getDueDate))
                .orElse(null);
        Summary.Milestone ms = (next == null) ? null : new Summary.Milestone(
                next.getTitle(), next.getDueDate().format(ISO)
        );

        return new Summary(
                progressPct,
                memberCount,
                0,
                new Summary.Assignments(open, inProgress, closed),
                ms
        );
    }

    public Status getStatus(Long projectId) {
        int progressPct = getSummary(projectId).progressPct();

        LocalDateTime a = assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId).stream()
                .map(Assignment::getDueDate).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime b = eventRepository.findByProject_IdOrderByStartAtAsc(projectId).stream()
                .map(Event::getStartAt).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime latest = (a == null ? b : (b == null ? a : (a.isAfter(b) ? a : b)));

        String lastUpdate = (latest != null) ? latest.format(ISO) : null;
        return new Status(progressPct, lastUpdate, List.of());
    }

    public List<DeadlineItem> getDeadlines(Long projectId, int limit) {
        var now = LocalDateTime.now();
        return assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId).stream()
                .filter(a -> a.getDueDate() != null && a.getDueDate().isAfter(now))
                .sorted(Comparator.comparing(Assignment::getDueDate))
                .limit(Math.max(0, limit))
                .map(a -> new DeadlineItem(a.getTitle(), a.getDueDate().format(ISO)))
                .toList();
    }

    /* ========= 교수 대시보드 요약 ========= */
    /**
     * “검토 대기”는 **PENDING만** 포함.
     * - 반려 시 ONGOING 으로 바꾸면 목록에 재등장하지 않음.
     */
    public ProfessorSummaryDto getProfessorSummary(Long professorUserId) {
        // 담당/참여 교수 기준: 팀 멤버십으로 연계
        List<Project> myProjects = projectRepository.findAllByProfessorUserId(professorUserId);
        if (myProjects.isEmpty()) {
            return new ProfessorSummaryDto(
                    new ProfessorSummaryDto.Metrics(0, 0, 0, 0.0, 0),
                    List.of(), List.of(), List.of()
            );
        }

        List<Long> projectIds = myProjects.stream().map(Project::getId).toList();

        // 프로젝트별 과제
        List<Assignment> allAssignments = assignmentRepository.findByProject_IdIn(projectIds);
        Map<Long, List<Assignment>> byProject = allAssignments.stream()
                .collect(Collectors.groupingBy(a -> a.getProject().getId()));

        // 메트릭 계산
        int courses = myProjects.size();
        int runningTeams = (int) myProjects.stream()
                .map(Project::getTeam).filter(Objects::nonNull)
                .map(Team::getId).distinct().count();

        // 학생 수(중복 제거, 교수/관리자 제외)
        List<Long> teamIds = myProjects.stream()
                .map(Project::getTeam).filter(Objects::nonNull)
                .map(Team::getId).distinct().toList();
        int studentCount = teamIds.isEmpty() ? 0 :
                (int) teamMemberRepository.countDistinctMembersByTeamIdsAndUserRole(teamIds, Role.STUDENT);

        // 검토 대기: PENDING만
        int pendingReviews = (int) allAssignments.stream()
                .filter(a -> a.getStatus() == AssignmentStatus.PENDING)
                .count();

        // 평균 진행률
        double avgProgress = myProjects.stream().mapToDouble(p -> {
            List<Assignment> list = byProject.getOrDefault(p.getId(), List.of());
            if (list.isEmpty()) return 0.0;
            long closed = list.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
            return (closed * 100.0) / list.size();
        }).average().orElse(0.0);
        avgProgress = Math.round(avgProgress * 10.0) / 10.0;

        ZoneId zone = ZoneId.systemDefault();

        // 검토 대기 목록 — PENDING만, 마감 임박순
        List<ProfessorSummaryDto.PendingReviewItem> pending = allAssignments.stream()
                .filter(a -> a.getStatus() == AssignmentStatus.PENDING)
                .sorted(Comparator.comparing(
                        a -> Optional.ofNullable(a.getDueDate()).orElse(LocalDateTime.MAX)
                ))
                .limit(20)
                .map(a -> new ProfessorSummaryDto.PendingReviewItem(
                        a.getId(),
                        a.getProject().getId(),
                        a.getProject().getTitle(),
                        a.getProject().getTeam() != null ? a.getProject().getTeam().getName() : null,
                        a.getTitle(),
                        toOffset(a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getDueDate(), zone)
                ))
                .toList();

        // 최근 제출물 — 최신 10건
        List<ProfessorSummaryDto.RecentSubmission> recent = allAssignments.stream()
                .sorted(Comparator.comparing((Assignment a) ->
                        Optional.ofNullable(a.getUpdatedAt())
                                .orElse(a.getDueDate() != null ? a.getDueDate() : LocalDateTime.MIN)
                ).reversed())
                .limit(10)
                .map(a -> new ProfessorSummaryDto.RecentSubmission(
                        a.getId(),
                        a.getProject().getId(),
                        a.getProject().getTitle(),
                        a.getProject().getTeam() != null ? a.getProject().getTeam().getName() : null,
                        a.getTitle(),
                        toOffset(a.getUpdatedAt() != null ? a.getUpdatedAt() : a.getDueDate(), zone),
                        a.getStatus().name()
                ))
                .toList();

        // 상위 성과 팀
        List<ProfessorSummaryDto.TopTeam> top = myProjects.stream()
                .map(p -> {
                    List<Assignment> list = byProject.getOrDefault(p.getId(), List.of());
                    double prog = 0.0;
                    if (!list.isEmpty()) {
                        long closed = list.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
                        prog = (closed * 100.0) / list.size();
                    }
                    return new AbstractMap.SimpleEntry<>(p, Math.round(prog * 10.0) / 10.0);
                })
                .sorted((e1, e2) -> Double.compare(e2.getValue(), e1.getValue()))
                .limit(5)
                .map(e -> new ProfessorSummaryDto.TopTeam(
                        e.getKey().getTeam() != null ? e.getKey().getTeam().getId() : null,
                        e.getKey().getTeam() != null ? e.getKey().getTeam().getName() : null,
                        e.getKey().getId(),
                        e.getKey().getTitle(),
                        e.getValue()
                ))
                .toList();

        return new ProfessorSummaryDto(
                new ProfessorSummaryDto.Metrics(runningTeams, pendingReviews, courses, avgProgress, studentCount),
                pending, recent, top
        );
    }

    private static OffsetDateTime toOffset(LocalDateTime ts, ZoneId zone) {
        if (ts == null) return null;
        return ts.atZone(zone).toOffsetDateTime();
    }
}
