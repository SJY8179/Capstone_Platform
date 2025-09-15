package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** 공통: Team -> TeamListDto 매핑 */
    private TeamListDto toDto(Team team) {
        // 동일 팀의 프로젝트가 여러 개여도 안전하게 최신 1건만 선택
        Optional<Project> prjOpt = projectRepository.findTopByTeam_IdOrderByCreatedAtDesc(team.getId());
        String projectTitle = prjOpt.map(Project::getTitle).orElse("미배정 프로젝트");
        Long projectId = prjOpt.map(Project::getId).orElse(null);

        var teamMembers = teamMemberRepository.findWithUserByTeamId(team.getId());

        Optional<TeamListDto.Person> leaderOpt = teamMembers.stream()
                .filter(tm -> toRole(tm.getRoleInTeam()) == TeamRole.LEADER)
                .findFirst()
                .map(tm -> new TeamListDto.Person(
                        tm.getUser().getName(),
                        tm.getUser().getEmail(),
                        null
                ));

        TeamListDto.Person leader = leaderOpt.orElse(null);

        List<TeamListDto.Member> members = teamMembers.stream()
                .map(tm -> {
                    TeamRole role = toRole(tm.getRoleInTeam());
                    String roleStr = (role == TeamRole.LEADER) ? "leader" : "member";
                    return new TeamListDto.Member(
                            tm.getUser().getId(),
                            tm.getUser().getName(),
                            tm.getUser().getEmail(),
                            null,
                            roleStr,
                            "active"
                    );
                })
                .toList();

        int meetings = 0;
        int totalTasks = 0;
        int completedTasks = 0;
        if (projectId != null) {
            meetings = (int) eventRepository.findByProject_IdOrderByStartAtAsc(projectId)
                    .stream().filter(e -> e.getType() == EventType.MEETING).count();

            var assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId);
            totalTasks = assigns.size();
            completedTasks = (int) assigns.stream()
                    .filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
        }

        TeamListDto.Stats stats = new TeamListDto.Stats(
                0,
                meetings,
                new TeamListDto.Tasks(completedTasks, totalTasks)
        );

        String createdAt = team.getCreatedAt() != null ? team.getCreatedAt().format(ISO) : null;
        String lastActivity = team.getUpdatedAt() != null ? team.getUpdatedAt().format(ISO) : createdAt;

        return new TeamListDto(
                team.getId(),
                team.getName(),
                projectTitle,
                null, // 별도 설명 없음
                leader,
                members,
                stats,
                createdAt,
                lastActivity
        );
    }

    /** (관리자) 전체 팀 */
    public List<TeamListDto> listTeams() {
        return teamRepository.findAll().stream().map(this::toDto).toList();
    }

    /** (공통) 내가 '팀 멤버'로 속한 팀 */
    public List<TeamListDto> listTeamsForUser(Long userId) {
        return teamRepository.findAllByMemberUserId(userId).stream().map(this::toDto).toList();
    }

    /** (교수) 내가 '담당 교수'인 프로젝트의 팀 */
    public List<TeamListDto> listTeamsForProfessor(Long professorUserId) {
        return teamRepository.findAllByProfessorUserId(professorUserId).stream().map(this::toDto).toList();
    }

    private static TeamRole toRole(Object raw) {
        if (raw == null) return TeamRole.MEMBER;
        if (raw instanceof TeamRole r) return r;
        if (raw instanceof String s) {
            try { return TeamRole.valueOf(s); }
            catch (IllegalArgumentException ignore) {}
        }
        return TeamRole.MEMBER;
    }
}
