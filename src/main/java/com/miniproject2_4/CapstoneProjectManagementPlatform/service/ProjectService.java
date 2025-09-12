package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

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

    /**
     * 내가 볼 수 있는 프로젝트 목록
     * - ADMIN    : 전체
     * - PROFESSOR: "담당 교수"로 매핑된 프로젝트만 (professor_id 기준)
     * - STUDENT  : 내가 팀 멤버인 프로젝트만
     */
    public List<ProjectListDto> listProjectsForUser(UserAccount ua) {
        if (ua == null) return List.of();

        if (ua.getRole() == Role.ADMIN) {
            return listProjects();
        } else if (ua.getRole() == Role.PROFESSOR) {
            // ✅ 교수는 오직 자신이 담당(professor_id)인 프로젝트만
            return projectRepository.findAllByProfessorUserId(ua.getId()).stream()
                    .map(this::toListDto)
                    .toList();
        } else {
            // 학생: 팀 멤버십 기준
            return projectRepository.findAllByMemberUserId(ua.getId()).stream()
                    .map(this::toListDto)
                    .toList();
        }
    }

    /** 교수 전용: 담당 프로젝트 목록 */
    public List<ProjectListDto> listProjectsByProfessor(Long userId) {
        return projectRepository.findAllByProfessorUserId(userId).stream()
                .map(this::toListDto)
                .toList();
    }

    /* ===== 내부 매핑 ===== */
    public ProjectListDto toListDto(Project p) {
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
                null,
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
