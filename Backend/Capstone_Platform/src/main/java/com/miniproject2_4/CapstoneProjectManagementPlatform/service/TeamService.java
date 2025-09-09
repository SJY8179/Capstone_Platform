package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.UserDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** /api/teams */
    public List<TeamListDto> listTeams() {
        return teamRepository.findAll().stream().map(team -> {
            // 프로젝트명
            String projectTitle = projectRepository.findByTeam_Id(team.getId())
                    .map(Project::getTitle)
                    .orElse("미배정 프로젝트");

            // 팀 멤버 전체 조회
            var teamMembers = teamMemberRepository.findWithUserByTeamId(team.getId());

            // 리더 1명
            Optional<TeamListDto.Person> leaderOpt = teamMembers.stream()
                    .filter(tm -> toRole(tm.getRoleInTeam()) == TeamRole.LEADER)
                    .findFirst()
                    .map(tm -> new TeamListDto.Person(
                            tm.getUser().getName(),
                            tm.getUser().getEmail(),
                            null // avatar
                    ));

            TeamListDto.Person leader = leaderOpt.orElse(null);

            // 멤버 DTO
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

            // 통계(회의/과제) - 존재하는 리포지토리 메서드만 사용
            Long projectId = projectRepository.findByTeam_Id(team.getId())
                    .map(Project::getId)
                    .orElse(null);

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
                    0, // 커밋 집계 소스 없음 → 0
                    meetings,
                    new TeamListDto.Tasks(completedTasks, totalTasks)
            );

            String createdAt = team.getCreatedAt() != null ? team.getCreatedAt().format(ISO) : null;
            String lastActivity = team.getUpdatedAt() != null ? team.getUpdatedAt().format(ISO) : createdAt;

            return new TeamListDto(
                    team.getId(),
                    team.getName(),
                    projectTitle,
                    "팀 소개가 없습니다.",
                    leader,
                    members,
                    stats,
                    createdAt,
                    lastActivity
            );
        }).toList();
    }

    /** TeamMember.roleInTeam 이 String/Enum 어느 쪽이든 안전 변환 */
    private static TeamRole toRole(Object raw) {
        if (raw == null) return TeamRole.MEMBER;
        if (raw instanceof TeamRole r) return r;
        if (raw instanceof String s) {
            try { return TeamRole.valueOf(s); }
            catch (IllegalArgumentException ignore) { /* fall-through */ }
        }
        return TeamRole.MEMBER;
    }

    /** /teams/{teamId}/invitable-users **/
    public List<UserDto> findInvitableUsers(Long teamId) {
        Set<Long> memberIds = teamMemberRepository.findWithUserByTeamId(teamId).stream()
                .map(tm -> tm.getUser().getId())
                .collect(Collectors.toSet());

        return userRepository.findAll().stream()
                .filter(user -> !memberIds.contains(user.getId()))
                .map(user -> new UserDto(user.getId(), user.getName(), user.getEmail()))
                .toList();
    }
}
