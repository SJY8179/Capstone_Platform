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

import java.util.*;
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

    /** (관리자) 전체 팀: /api/teams */
    public List<TeamListDto.Response> listTeams() {
        return teamRepository.findAll().stream()
                .map(this::convertToDto)
                .toList();
    }

    /** (공통) 내가 속한 팀만: /api/teams/my */
    public List<TeamListDto.Response> listTeamsForUser(Long userId) {
        return teamRepository.findAllByMemberUserId(userId).stream()
                .map(this::convertToDto)
                .toList();
    }

    /** (교수) 내가 '담당 교수'인 프로젝트의 팀: /api/teams/teaching */
    public List<TeamListDto.Response> listTeamsForProfessor(Long professorUserId) {
        return teamRepository.findAllByProfessorUserId(professorUserId).stream()
                .map(this::convertToDto)
                .toList();
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

    /** 팀 생성: 새 팀 + (필요 시) 새 프로젝트 자동 생성 */
    @Transactional
    public TeamListDto.Response createTeam(TeamListDto.CreateRequest request, Long userId) {
        UserAccount creator = findUserById(userId);

        // 1) 팀 생성
        Team newTeam = Team.builder()
                .name(request.name())
                .description(request.description())
                .build();
        teamRepository.save(newTeam);

        // 2) 생성자를 팀장으로 추가
        TeamMemberId teamMemberId = new TeamMemberId(newTeam.getId(), creator.getId());
        TeamMember creatorAsLeader = TeamMember.builder()
                .id(teamMemberId)
                .team(newTeam)
                .user(creator)
                .roleInTeam(TeamRole.LEADER.name())
                .build();
        teamMemberRepository.save(creatorAsLeader);

        // 3) 프로젝트 자동 생성
        //    - 생성자가 교수면 담당 교수로 지정
        //    - 그 외(학생/조교/관리자)는 NULL로 두어 DB 트리거 충돌 방지
        UserAccount professor = (creator.getRole() == Role.PROFESSOR) ? creator : null;

        Project newProject = Project.builder()
                .team(newTeam)
                .professor(professor) // null 허용(트리거가 잘못된 값을 끼워넣지 않게)
                .title((request.name() != null && !request.name().isBlank()) ? request.name() : "새 프로젝트")
                .status(Project.Status.ACTIVE)
                .archived(false)
                .build();
        projectRepository.saveAndFlush(newProject); // 제약 위반을 조기 감지

        // 4) 응답 매핑
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
                .roleInTeam(TeamRole.MEMBER.name())
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
            throw new IllegalStateException("팀 리더는 팀에서 삭제할 수 없습니다. 먼저 리더를 변경해주세요.");
        }
        teamMemberRepository.delete(member);
    }

    @Transactional
    public void deleteTeam(Long teamId, Long requesterId) {
        checkLeaderPermission(teamId, requesterId);

        // 프로젝트 연결 여부 확인 (연결되어 있으면 삭제 불가)
        if (resolveProjectForTeam(teamId) != null) {
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

    /** 요청자가 해당 팀의 멤버인지 확인 */
    private void checkMemberPermission(Long teamId, Long userId) {
        if (!teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, userId)) {
            throw new AccessDeniedException("팀에 소속된 멤버만 이 작업을 수행할 수 있습니다.");
        }
    }

    /** 요청자가 팀의 리더인지 확인 */
    private void checkLeaderPermission(Long teamId, Long userId) {
        TeamMember requester = findTeamMemberById(teamId, userId);
        if (toRole(requester.getRoleInTeam()) != TeamRole.LEADER) {
            throw new AccessDeniedException("팀 리더만 이 작업을 수행할 수 있습니다.");
        }
    }

    /** Team → TeamListDto.Response 변환 (NonUniqueResult 안전 버전) */
    private TeamListDto.Response convertToDto(Team team) {
        // 같은 팀에 연결된 "대표" 프로젝트 선택 (중복 존재 시 가장 최근 id)
        Project project = resolveProjectForTeam(team.getId());

        String projectTitle = (project != null) ? project.getTitle() : "미배정 프로젝트";
        Long projectId = (project != null) ? project.getId() : null;

        // 팀 멤버 전체 조회
        List<TeamMember> teamMembers = teamMemberRepository.findWithUserByTeamId(team.getId());
        if (teamMembers == null) teamMembers = Collections.emptyList();

        // 통계(회의/과제) 조회
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
                0, // 커밋 집계는 미연결 → 0
                meetings,
                new TeamListDto.Response.Tasks(completedTasks, totalTasks)
        );

        return TeamListDto.Response.from(team, teamMembers, projectTitle, stats);
    }

    /**
     * 같은 팀에 연결된 프로젝트가 여러 개여도 예외 없이 하나만 선택.
     * 우선순위: 생성일 내림차순(가장 최근).
     */
    private Project resolveProjectForTeam(Long teamId) {
        return projectRepository.findTopByTeam_IdOrderByCreatedAtDesc(teamId).orElse(null);
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
