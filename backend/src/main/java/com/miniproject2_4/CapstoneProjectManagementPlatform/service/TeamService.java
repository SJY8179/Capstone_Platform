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
    private final EventService eventService;

    /** (관리자) 전체 팀 */
    public List<TeamListDto.Response> listTeams() {
        return teamRepository.findAll().stream().map(this::convertToDto).toList();
    }

    /** 내가 속한 팀만 */
    public List<TeamListDto.Response> listTeamsForUser(Long userId) {
        return teamRepository.findAllByMemberUserId(userId).stream().map(this::convertToDto).toList();
    }

    /** (교수) 내가 담당 교수인 프로젝트의 팀 */
    public List<TeamListDto.Response> listTeamsForProfessor(Long professorUserId) {
        return teamRepository.findAllByProfessorUserId(professorUserId).stream().map(this::convertToDto).toList();
    }

    /** 초대 가능 목록(교수/TA 제외) */
    public List<UserDto> findInvitableUsers(Long teamId) {
        Set<Long> memberIds = teamMemberRepository.findWithUserByTeamId(teamId).stream()
                .map(tm -> tm.getUser().getId())
                .collect(Collectors.toSet());

        return userRepository.findAll().stream()
                .filter(u -> !memberIds.contains(u.getId()))
                .filter(u -> u.getRole() != Role.PROFESSOR && u.getRole() != Role.TA)
                .map(u -> new UserDto(u.getId(), u.getName(), u.getEmail()))
                .toList();
    }

    /** 팀 역할별 사용자 */
    public List<UserDto> listTeamMembersByRole(Long teamId, Role role) {
        return teamMemberRepository.findUsersByTeamIdAndRole(teamId, role).stream()
                .map(u -> new UserDto(u.getId(), u.getName(), u.getEmail()))
                .toList();
    }

    /**
     * 팀 생성
     * - 학생: LEADER 자동 추가
     * - 교수: MEMBER 자동 추가 (LEADER 금지 트리거 회피)
     * - 관리자: LEADER 자동 추가
     * - 자동 프로젝트/이벤트 기록 없음
     */
    @Transactional
    public TeamListDto.Response createTeam(TeamListDto.CreateRequest request, Long userId) {
        UserAccount creator = findUserById(userId);

        if (teamRepository.existsByName(request.name())) {
            throw new IllegalStateException("이미 존재하는 팀 이름입니다: " + request.name());
        }

        Team newTeam = Team.builder()
                .name(request.name())
                .description(request.description())
                .build();
        teamRepository.save(newTeam);

        if (creator.getRole() == Role.STUDENT) {
            TeamMemberId id = new TeamMemberId(newTeam.getId(), creator.getId());
            TeamMember leader = TeamMember.builder()
                    .id(id).team(newTeam).user(creator)
                    .roleInTeam(TeamRole.LEADER.name())
                    .build();
            teamMemberRepository.save(leader);
        } else if (creator.getRole() == Role.ADMIN) {
            TeamMemberId id = new TeamMemberId(newTeam.getId(), creator.getId());
            TeamMember leader = TeamMember.builder()
                    .id(id).team(newTeam).user(creator)
                    .roleInTeam(TeamRole.LEADER.name())
                    .build();
            teamMemberRepository.save(leader);
        } else if (creator.getRole() == Role.PROFESSOR) {
            TeamMemberId id = new TeamMemberId(newTeam.getId(), creator.getId());
            TeamMember member = TeamMember.builder()
                    .id(id).team(newTeam).user(creator)
                    .roleInTeam(TeamRole.MEMBER.name())
                    .build();
            teamMemberRepository.save(member);
        }
        return convertToDto(newTeam);
    }

    /** 팀원 즉시 추가(관리자 전용; 일반 사용자는 초대 플로우) */
    @Transactional
    public void addMember(Long teamId, Long userId, Long requesterId) {
        UserAccount requester = findUserById(requesterId);
        if (requester.getRole() != Role.ADMIN) {
            checkMemberPermission(teamId, requesterId);
        }

        Team team = findTeamById(teamId);
        UserAccount user = findUserById(userId);

        TeamMemberId teamMemberId = new TeamMemberId(teamId, userId);
        if (teamMemberRepository.existsById(teamMemberId)) {
            throw new IllegalStateException("해당 사용자는 이미 팀에 속해있습니다.");
        }

        TeamMember newTeamMember = TeamMember.builder()
                .id(teamMemberId).team(team).user(user)
                .roleInTeam(TeamRole.MEMBER.name())
                .build();
        teamMemberRepository.save(newTeamMember);
    }

    /** 팀 정보 수정 — 팀장 OR 교수 OR 관리자 */
    @Transactional
    public TeamListDto.Response updateTeamInfo(Long teamId, TeamListDto.UpdateRequest request, Long requesterId) {
        checkManagerPermission(teamId, requesterId);
        Team team = findTeamById(teamId);
        team.setName(request.name());
        team.setDescription(request.description());
        return convertToDto(team);
    }

    /** 팀장 변경 — 팀장 OR 교수 OR 관리자 */
    @Transactional
    public void changeLeader(Long teamId, Long newLeaderId, Long requesterId) {
        // 권한: 팀장/교수/관리자
        checkManagerPermission(teamId, requesterId);

        // 새 리더는 반드시 "해당 팀"의 멤버여야 함
        TeamMember newLeader = findTeamMemberById(teamId, newLeaderId);

        // 팀 전체 멤버 조회 (roleInTeam 대소문자/NULL 방어는 toRole로 처리)
        List<TeamMember> members = teamMemberRepository.findWithUserByTeamId(teamId);
        TeamMember currentLeader = null;
        for (TeamMember tm : members) {
            if (toRole(tm.getRoleInTeam()) == TeamRole.LEADER) {
                currentLeader = tm;
                break;
            }
        }

        // 1) 현재 리더가 없으면(초기화 상태) → 새 리더만 지정
        if (currentLeader == null) {
            newLeader.setRoleInTeam(TeamRole.LEADER.name());
            return;
        }

        // 2) 동일 인물로 리더 변경 요청이면 무시
        if (Objects.equals(currentLeader.getUser().getId(), newLeaderId)) {
            return;
        }

        // 3) 기존 리더는 MEMBER로 강등, 새 리더는 LEADER로 승격
        currentLeader.setRoleInTeam(TeamRole.MEMBER.name());
        newLeader.setRoleInTeam(TeamRole.LEADER.name());

        // 4) 데이터 정합성: 혹시 다수 리더가 존재하면 모두 MEMBER로 정리(신규 리더 제외)
        for (TeamMember tm : members) {
            if (toRole(tm.getRoleInTeam()) == TeamRole.LEADER
                    && !Objects.equals(tm.getUser().getId(), newLeaderId)) {
                tm.setRoleInTeam(TeamRole.MEMBER.name());
            }
        }
    }

    /** 팀원 삭제 — 팀장 OR 교수 OR 관리자 (단, 리더는 삭제 불가) */
    @Transactional
    public void removeMember(Long teamId, Long memberId, Long requesterId) {
        // 권한: 팀장/교수/관리자
        checkManagerPermission(teamId, requesterId);

        TeamMember member = findTeamMemberById(teamId, memberId);
        if (toRole(member.getRoleInTeam()) == TeamRole.LEADER) {
            throw new IllegalStateException("팀 리더는 팀에서 삭제할 수 없습니다. 먼저 리더를 변경해주세요.");
        }
        teamMemberRepository.delete(member);
    }

    /** 팀 삭제 — 팀장 OR 교수 OR 관리자 */
    @Transactional
    public void deleteTeam(Long teamId, Long requesterId) {
        checkManagerPermission(teamId, requesterId);

        if (resolveProjectForTeam(teamId) != null) {
            throw new IllegalStateException("프로젝트에 할당된 팀은 삭제할 수 없습니다.");
        }

        Team team = findTeamById(teamId);
        UserAccount requester = findUserById(requesterId);

        eventService.logSystemActivity("팀 삭제: " + team.getName() + " (삭제자: " + requester.getName() + ")", null);

        teamMemberRepository.deleteByTeamId(teamId);
        teamRepository.deleteById(teamId);
    }

    /** ───── 권한/유틸 ───── */

    private static TeamRole toRole(Object raw) {
        if (raw == null) return TeamRole.MEMBER;
        if (raw instanceof TeamRole r) return r;
        if (raw instanceof String s) {
            try { return TeamRole.valueOf(s.toUpperCase()); } catch (IllegalArgumentException ignore) {}
        }
        return TeamRole.MEMBER;
    }

    private void checkMemberPermission(Long teamId, Long userId) {
        if (!teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, userId)) {
            throw new AccessDeniedException("팀에 소속된 멤버만 이 작업을 수행할 수 있습니다.");
        }
    }

    /** 팀장 OR 교수 OR 관리자 허용 */
    private void checkManagerPermission(Long teamId, Long userId) {
        UserAccount u = findUserById(userId);
        if (u.getRole() == Role.ADMIN || u.getRole() == Role.PROFESSOR) {
            return; // 전역 관리자/교수는 허용(팀 소속 여부와 무관)
        }
        // 팀 멤버이면서 리더인지 검사
        TeamMember requester = findTeamMemberById(teamId, userId);
        if (toRole(requester.getRoleInTeam()) != TeamRole.LEADER) {
            throw new AccessDeniedException("팀 리더, 교수, 관리자만 이 작업을 수행할 수 있습니다.");
        }
    }

    private TeamListDto.Response convertToDto(Team team) {
        Project project = resolveProjectForTeam(team.getId());

        String projectTitle = (project != null) ? project.getTitle() : "미배정 프로젝트";
        Long projectId = (project != null) ? project.getId() : null;

        List<TeamMember> teamMembers = teamMemberRepository.findWithUserByTeamId(team.getId());
        if (teamMembers == null) teamMembers = Collections.emptyList();

        int meetings = 0;
        int totalTasks = 0;
        int completedTasks = 0;
        if (projectId != null) {
            meetings = (int) eventRepository.findByProject_IdOrderByStartAtAsc(projectId)
                    .stream().filter(e -> e.getType() == EventType.MEETING).count();

            var assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId);
            totalTasks = assigns.size();
            completedTasks = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
        }

        TeamListDto.Response.Stats stats = new TeamListDto.Response.Stats(
                0,
                meetings,
                new TeamListDto.Response.Tasks(completedTasks, totalTasks)
        );

        return TeamListDto.Response.from(team, teamMembers, projectTitle, stats);
    }

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

    /** 모든 교수 목록 */
    public List<UserDto> getAllProfessors() {
        List<UserAccount> professors = userRepository.findByRole(Role.PROFESSOR);
        return professors.stream().map(p -> new UserDto(p.getId(), p.getName(), p.getEmail())).toList();
    }

    /** 팀에 교수 추가(MEMBER) */
    @Transactional
    public void addProfessorToTeam(Long teamId, Long professorId, Long requesterId) {
        Team team = findTeamById(teamId);

        UserAccount requester = findUserById(requesterId);
        boolean requesterAllowed = requester.getRole() == Role.ADMIN
                || teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, requesterId);
        if (!requesterAllowed) {
            throw new AccessDeniedException("팀 멤버만 교수를 추가할 수 있습니다.");
        }

        UserAccount professor = findUserById(professorId);
        if (professor.getRole() != Role.PROFESSOR) {
            throw new IllegalArgumentException("해당 사용자는 교수가 아닙니다.");
        }

        boolean already = teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, professorId);
        if (already) {
            throw new IllegalStateException("이미 팀에 소속된 교수입니다.");
        }

        TeamMember newMember = TeamMember.builder()
                .id(new TeamMemberId(teamId, professorId))
                .team(team)
                .user(professor)
                .roleInTeam(TeamRole.MEMBER.name())
                .build();
        teamMemberRepository.save(newMember);
    }

    @Transactional
    public int removeProfessorsAndTAsFromAllTeams() {
        return 0;
    }
}
