package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

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

    public record Status(
            int progressPct,
            String lastUpdate,
            List<String> actions
    ) {}

    public record DeadlineItem(
            String title,
            String dueDate
    ) {}

    /* ========= Queries ========= */

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
                0, // commit data 없음
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
}
