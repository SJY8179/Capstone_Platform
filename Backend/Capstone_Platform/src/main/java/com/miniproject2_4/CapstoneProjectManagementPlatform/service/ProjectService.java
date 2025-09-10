package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
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
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** /api/projects → FE ProjectListDto */
    public List<ProjectListDto> listProjects() {
        return projectRepository.findAllWithTeam().stream()
                .map(this::toListDto)
                .toList();
    }

    private ProjectListDto toListDto(Project p) {
        String teamName = (p.getTeam() != null && p.getTeam().getName() != null)
                ? p.getTeam().getName()
                : "미지정 팀";

        var members = (p.getTeam() == null)
                ? List.<ProjectListDto.Member>of()
                : teamMemberRepository.findWithUserByTeamId(p.getTeam().getId()).stream()
                .map(tm -> new ProjectListDto.Member(
                        tm.getUser() != null ? tm.getUser().getId() : null,
                        tm.getUser() != null ? (tm.getUser().getName() != null ? tm.getUser().getName() : tm.getUser().getEmail()) : "이름없음"
                ))
                .toList();

        var assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(p.getId());
        int total = assigns.size();
        int completed = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
        int progress = total == 0 ? 0 : (int) Math.round(completed * 100.0 / total);

        var now = LocalDateTime.now();
        var next = assigns.stream()
                .filter(a -> a.getDueDate() != null && !a.getDueDate().isBefore(now))
                .min(Comparator.comparing(Assignment::getDueDate))
                .orElse(null);

        // 최근 업데이트 = 과제 dueDate, 이벤트 startAt 중 최댓값 → 없으면 엔티티 updatedAt/createdAt
        LocalDateTime luAssign = assigns.stream()
                .map(Assignment::getDueDate).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime luEvent = eventRepository.findByProject_IdOrderByStartAtAsc(p.getId()).stream()
                .map(Event::getStartAt).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime latest = latestOf(
                latestOf(luAssign, luEvent),
                p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt()
        );
        String lastUpdate = (latest != null) ? latest.format(ISO) : null;

        return new ProjectListDto(
                p.getId(),
                p.getTitle() != null ? p.getTitle() : ("프로젝트 #" + p.getId()),
                null, // 별도 설명 필드가 없으면 null
                mapStatus(p.getStatus()),
                teamName,
                lastUpdate,
                progress,
                members,
                new ProjectListDto.Milestones(completed, total),
                (next == null ? null : new ProjectListDto.NextDeadline(
                        next.getTitle(), next.getDueDate().format(ISO)))
        );
    }

    /** Project.getStatus()가 enum이든 문자열이든 대응 */
    private String mapStatus(Object raw) {
        if (raw == null) return "in-progress";
        String s = (raw instanceof Enum<?> e) ? e.name() : String.valueOf(raw);
        s = s.replace('_','-').toUpperCase();
        return switch (s) {
            case "ACTIVE", "IN-PROGRESS", "INPROGRESS" -> "in-progress";
            case "REVIEW", "REVIEWING" -> "review";
            case "COMPLETED", "DONE" -> "completed";
            case "PLANNING", "PLAN" -> "planning";
            default -> "in-progress";
        };
    }

    private static LocalDateTime latestOf(LocalDateTime a, LocalDateTime b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isAfter(b) ? a : b;
    }
}