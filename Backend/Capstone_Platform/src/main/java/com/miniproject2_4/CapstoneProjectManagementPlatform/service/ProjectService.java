package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
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
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AssignmentRepository assignmentRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** /api/projects 목록 */
    public List<ProjectListDto> listProjects() {
        return projectRepository.findAllWithTeam().stream().map(p -> {
            var team = p.getTeam();
            var teamName = (team != null && team.getName() != null) ? team.getName() : "미지정 팀";

            var members = (team == null)
                    ? List.<ProjectListDto.Member>of()
                    : teamMemberRepository.findWithUserByTeamId(team.getId()).stream()
                    .map(m -> new ProjectListDto.Member(
                            m.getUser() != null ? m.getUser().getId() : null,
                            m.getUser() != null ? m.getUser().getName() : "이름없음"))
                    .toList();

            // 마일스톤(과제) 집계
            List<Assignment> assigns =
                    assignmentRepository.findByProject_IdOrderByDueDateAsc(p.getId());
            int total = assigns.size();
            int completed = (int) assigns.stream()
                    .filter(a -> a.getStatus() == AssignmentStatus.COMPLETED)
                    .count();
            int progress = total == 0 ? 0 : (int) Math.round(completed * 100.0 / total);

            // 다음 마감
            LocalDateTime now = LocalDateTime.now();
            var next = assigns.stream()
                    .filter(a -> a.getDueDate() != null && !a.getDueDate().isBefore(now))
                    .min(Comparator.comparing(Assignment::getDueDate))
                    .orElse(null);

            LocalDateTime lu = p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt();
            String lastUpdate = lu != null ? lu.format(ISO) : LocalDateTime.now().format(ISO);

            return new ProjectListDto(
                    p.getId(),
                    p.getTitle() != null ? p.getTitle() : ("프로젝트 #" + p.getId()),
                    (teamName + "의 캡스톤 프로젝트"),
                    mapStatus(p.getStatus()),
                    teamName,
                    lastUpdate,
                    progress,
                    members,
                    new ProjectListDto.Milestones(completed, total),
                    next == null ? null : new ProjectListDto.NextDeadline(
                            next.getTitle() != null ? next.getTitle() : "마감",
                            next.getDueDate().format(ISO))
            );
        }).toList();
    }

    /** Project.Status -> 프론트 문자열 매핑 */
    private String mapStatus(Project.Status status) {
        if (status == null) return "planning"; // null 가드
        return switch (status) {
            case ACTIVE -> "in-progress";
            case REVIEW -> "review";
            case COMPLETED -> "completed";
            case PLANNING -> "planning";
            default -> "planning";
        };
    }
}
