package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProfessorSummaryDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
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

    /** 관리자 요약 집계에 필요 */
    private final UserRepository userRepository;
    private final ProjectOverviewRepository projectOverviewRepository;

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

    /** 관리자 대시보드용 DTO */
    public record AdminSummary(
            long totalUsers,
            long activeCourses,
            long activeProjects,
            double uptimePct
    ) {}

    public record ActivityItem(
            Long id,
            String title,
            String type,
            Long projectId,
            String projectTitle,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String location
    ) {}

    /* ========= 프로젝트 단위 대시보드 ========= */
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

    /* ========= 교수 대시보드 요약 =========
       ➜ 교수 계정은 ‘팀 멤버십’ ∪ ‘담당 교수 배정’의 합집합으로 집계  */
    public ProfessorSummaryDto getProfessorSummary(Long professorUserId) {
        // A. 담당 교수인 프로젝트
        List<Project> asProfessor = projectRepository.findAllByProfessorUserId(professorUserId);
        // B. 팀 멤버로 속한 프로젝트
        List<Project> asMember   = projectRepository.findAllByMemberUserId(professorUserId);
        // C. 합집합(프로젝트 ID 기준, 앞쪽 순서 보존)
        List<Project> myProjects = unionById(asProfessor, asMember);

        if (myProjects.isEmpty()) {
            return new ProfessorSummaryDto(
                    new ProfessorSummaryDto.Metrics(0, 0, 0, 0.0, 0),
                    List.of(), List.of(), List.of()
            );
        }

        List<Long> projectIds = myProjects.stream().map(Project::getId).toList();

        // 과제 전부 로드 후 프로젝트별 그룹
        List<Assignment> allAssignments = assignmentRepository.findByProject_IdIn(projectIds);
        Map<Long, List<Assignment>> byProject = allAssignments.stream()
                .collect(Collectors.groupingBy(a -> a.getProject().getId()));

        // 메트릭 계산
        int courses = myProjects.size(); // 표시용은 아니지만 유지
        int runningTeams = (int) myProjects.stream()
                .map(Project::getTeam).filter(Objects::nonNull)
                .map(Team::getId).distinct().count();

        List<Long> teamIds = myProjects.stream()
                .map(Project::getTeam).filter(Objects::nonNull)
                .map(Team::getId).distinct().toList();

        int studentCount = teamIds.isEmpty() ? 0 :
                (int) teamMemberRepository.countDistinctMembersByTeamIdsAndUserRole(teamIds, Role.STUDENT);

        int pendingReviews = (int) allAssignments.stream()
                .filter(a -> a.getStatus() == AssignmentStatus.PENDING)
                .count();

        double avgProgress = myProjects.stream().mapToDouble(p -> {
            List<Assignment> list = byProject.getOrDefault(p.getId(), List.of());
            if (list.isEmpty()) return 0.0;
            long closed = list.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
            return (closed * 100.0) / list.size();
        }).average().orElse(0.0);
        avgProgress = Math.round(avgProgress * 10.0) / 10.0;

        ZoneId zone = ZoneId.systemDefault();

        // 검토 대기 목록(최대 20) — 합집합 대상의 과제 중 PENDING만
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

        // 최근 제출물(최대 10)
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

        // 상위 성과 팀(최대 5) — 평균 진도 높은 순
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

    /** 프로젝트 리스트 합집합(프로젝트 ID 기준, 앞쪽 리스트 우선 순서 보존) */
    private List<Project> unionById(List<Project> a, List<Project> b) {
        if ((a == null || a.isEmpty()) && (b == null || b.isEmpty())) return List.of();
        Map<Long, Project> map = new LinkedHashMap<>();
        if (a != null) for (Project p : a) map.put(p.getId(), p);
        if (b != null) for (Project p : b) map.putIfAbsent(p.getId(), p);
        return new ArrayList<>(map.values());
    }

    private static OffsetDateTime toOffset(LocalDateTime ts, ZoneId zone) {
        if (ts == null) return null;
        return ts.atZone(zone).toOffsetDateTime();
    }

    /* ========= 관리자 대시보드 ========= */

    public AdminSummary getAdminSummary() {
        long totalUsers = userRepository.count();

        // countByArchivedFalse() 대신 이미 존재하는 쿼리 메서드로 안전하게 계산
        long activeProjects = projectRepository.findAllWithTeamByArchived(false).size();

        long activeCourses = projectOverviewRepository
                .countByStatusAndProject_ArchivedFalse(ProjectOverview.Status.PUBLISHED);

        double uptimePct = 99.9; // 추후 헬스체크 연동 가능

        return new AdminSummary(totalUsers, activeCourses, activeProjects, uptimePct);
    }

    public List<ActivityItem> getRecentActivities(int limit) {
        int size = Math.max(1, Math.min(limit, 100));
        var events = eventRepository.findAllActivitiesOrderByStartAtDesc(PageRequest.of(0, size));
        return events.stream().map(e -> new ActivityItem(
                e.getId(),
                e.getTitle(),
                e.getType() != null ? e.getType().name() : null,
                e.getProject() != null ? e.getProject().getId() : null,
                (e.getProject() != null ? e.getProject().getTitle() : null),
                e.getStartAt(),
                e.getEndAt(),
                e.getLocation()
        )).toList();
    }
}
