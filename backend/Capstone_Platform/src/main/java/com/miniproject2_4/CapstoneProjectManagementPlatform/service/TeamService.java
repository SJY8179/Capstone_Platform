package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.UserDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** 전체 팀: /api/teams */
    public List<TeamListDto.Response> listTeams() {
        return teamRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /** 내가 속한 팀만 */
    public List<TeamListDto.Response> listTeamsForUser(Long userId) {
        return teamRepository.findAllByMemberUserId(userId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    /** /api/teams/{teamId}/invitable-users **/
    public List<UserDto> findInvitableUsers(Long teamId) {
        Set<Long> memberIds = teamMemberRepository.findWithUserByTeamId(teamId).stream()
                .map(tm -> tm.getUser().getId())
                .collect(Collectors.toSet());

        return userRepository.findAll().stream()
                .filter(user -> !memberIds.contains(user.getId()))
                .map(user -> new UserDto(user.getId(), user.getName(), user.getEmail()))
                .toList();
    }

    /** /api/teams **/
    @Transactional
    public TeamListDto.Response createTeam(TeamListDto.CreateRequest request, Long userId) {
        UserAccount creator = findUserById(userId);

        Team newTeam = Team.builder()
                .name(request.name())
                .description(request.description())
                .build();
        teamRepository.save(newTeam);

        TeamMemberId teamMemberId = new TeamMemberId(newTeam.getId(), creator.getId());
        TeamMember creatorAsLeader = TeamMember.builder()
                .id(teamMemberId)
                .team(newTeam)
                .user(creator)
                .roleInTeam("LEADER")
                .build();
        teamMemberRepository.save(creatorAsLeader);

        return convertToDto(newTeam);
    }

    /** /api/teams/{teamId}/members **/
    @Transactional
    public void addMember(Long teamId, Long userId, Long requesterId) {
        checkMemberPermission(teamId, requesterId);

        Team team = findTeamById(teamId);
        UserAccount user = findUserById(userId);

        TeamMemberId teamMemberId = new TeamMemberId(teamId, userId);
        if (teamMemberRepository.existsById(teamMemberId)) {
            throw new IllegalStateException("해당 사용자는 이미 팀에 속해있습니다.");
        }

        TeamMember newTeamMember = TeamMember.builder()
                .id(teamMemberId)
                .team(team)
                .user(user)
                .roleInTeam("MEMBER")
                .build();

        teamMemberRepository.save(newTeamMember);
    }

    @Transactional
    public TeamListDto.Response updateTeamInfo(Long teamId, TeamListDto.UpdateRequest request, Long requesterId) {
        checkLeaderPermission(teamId, requesterId);
        Team team = findTeamById(teamId);
        team.setName(request.name());
        team.setDescription(request.description());
        return convertToDto(team);
    }

    @Transactional
    public void changeLeader(Long teamId, Long newLeaderId, Long requesterId) {
        checkLeaderPermission(teamId, requesterId);
        if (requesterId.equals(newLeaderId)) return;

        TeamMember oldLeader = findTeamMemberById(teamId, requesterId);
        TeamMember newLeader = findTeamMemberById(teamId, newLeaderId);

        oldLeader.setRoleInTeam(TeamRole.MEMBER.name());
        newLeader.setRoleInTeam(TeamRole.LEADER.name());
    }

    @Transactional
    public void removeMember(Long teamId, Long memberId, Long requesterId) {
        checkLeaderPermission(teamId, requesterId);
        TeamMember member = findTeamMemberById(teamId, memberId);

        if (toRole(member.getRoleInTeam()) == TeamRole.LEADER) {
            // throw new BusinessLogicException(ErrorCode.LEADER_CANNOT_BE_REMOVED);
            throw new IllegalStateException("팀 리더는 팀에서 삭제할 수 없습니다. 먼저 리더를 변경해주세요.");
        }
        teamMemberRepository.delete(member);
    }

    @Transactional
    public void deleteTeam(Long teamId, Long requesterId) {
        checkLeaderPermission(teamId, requesterId);

        if (projectRepository.findByTeam_Id(teamId).isPresent()) {
            throw new IllegalStateException("프로젝트에 할당된 팀은 삭제할 수 없습니다.");
        }
        teamMemberRepository.deleteByTeamId(teamId);
        teamRepository.deleteById(teamId);
    }

    /** TeamMember.roleInTeam 이 String/Enum 어느 쪽이든 안전 변환 */
    private static TeamRole toRole(Object raw) {
        if (raw == null) return TeamRole.MEMBER;
        if (raw instanceof TeamRole r) return r;
        if (raw instanceof String s) {
            try { return TeamRole.valueOf(s.toUpperCase()); }
            catch (IllegalArgumentException ignore) { /* fall-through */ }
        }
        return TeamRole.MEMBER;
    }

    /** 요청자가 해당 팀의 멤버인지 확인하는 권한 검사 메서드 */
    private void checkMemberPermission(Long teamId, Long userId) {
        if (!teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, userId)) {
            throw new AccessDeniedException("팀에 소속된 멤버만 이 작업을 수행할 수 있습니다.");
        }
    }

    /** 요청자가 팀의 리더인지 확인하는 권한 검사 메서드 */
    private void checkLeaderPermission(Long teamId, Long userId) {
        TeamMember requester = findTeamMemberById(teamId, userId);
        if (toRole(requester.getRoleInTeam()) != TeamRole.LEADER) {
            throw new AccessDeniedException("팀 리더만 이 작업을 수행할 수 있습니다.");
        }
    }

    private TeamListDto.Response convertToDto(Team team) {
        // 프로젝트명 조회
        String projectTitle = projectRepository.findByTeam_Id(team.getId())
                .map(Project::getTitle)
                .orElse("미배정 프로젝트");

        // 팀 멤버 전체 조회
        List<TeamMember> teamMembers = teamMemberRepository.findWithUserByTeamId(team.getId());
        if (teamMembers == null) teamMembers = Collections.emptyList();

        // 통계(회의/과제) 조회 - 존재하는 리포지토리 메서드만 사용
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

        TeamListDto.Response.Stats stats = new TeamListDto.Response.Stats(
                0, // 커밋 집계 소스는 없음 -> 0
                meetings,
                new TeamListDto.Response.Tasks(completedTasks, totalTasks)
        );

        return TeamListDto.Response.from(team, teamMembers, projectTitle, stats);
    }

    private UserAccount findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("해당 사용자를 찾을 수 없습니다: " + userId));
    }

    private Team findTeamById(Long teamId) {
        return teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("해당 팀을 찾을 수 없습니다: " + teamId));
    }

    private TeamMember findTeamMemberById(Long teamId, Long userId) {
        return teamMemberRepository.findById(new TeamMemberId(teamId, userId))
                .orElseThrow(() -> new EntityNotFoundException("해당 팀원을 찾을 수 없습니다: " + userId));
    }

}
