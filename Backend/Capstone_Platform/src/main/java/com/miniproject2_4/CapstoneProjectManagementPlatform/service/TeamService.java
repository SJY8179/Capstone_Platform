package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
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
    private final TeamInvitationRepository teamInvitationRepository;
    private final NotificationService notificationService;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

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

    /** 초대 가능한 유저（교수,관리자 제외）: /api/teams/{teamId}/invitable-users */
    @Transactional
    public List<InvitableUserDto> findInvitableUsers(Long teamId) {
        Set<Long> memberIds = teamMemberRepository.findWithUserByTeamId(teamId).stream()
                .map(tm -> tm.getUser().getId())
                .collect(Collectors.toSet());

        List<UserAccount> invitableStudents = userRepository.findByRoleAndIdNotIn(Role.STUDENT, memberIds);

        Set<Long> pendingInviteeIds = teamInvitationRepository
                .findByTeam_IdAndStatus(teamId, RequestStatus.PENDING).stream()
                .map(invitation -> invitation.getInvitee().getId())
                .collect(Collectors.toSet());

        return invitableStudents.stream()
                .map(user -> {
                    String status = pendingInviteeIds.contains(user.getId()) ? "PENDING" : "NONE";
                    return new InvitableUserDto(user.getId(), user.getName(), user.getEmail(), status);
                })
                .toList();
    }

    public List<UserDto> listTeamMembersByRole(Long teamId, Role role) {
        return teamMemberRepository.findUsersByTeamIdAndRole(teamId, role).stream()
                .map(u -> new UserDto(u.getId(), u.getName(), u.getEmail()))
                .toList();
    }

    /**
     * 팀 생성
     *
     * ⚠️ 트리거 충돌 방지를 위해 '팀 생성 시 자동 프로젝트 생성'을 하지 않습니다.
     *    프로젝트는 이후 /projects API로 분리 생성하세요.
     *
     * 팀 생성자는 역할에 관계없이 리더로 추가됩니다.
     */
    @Transactional
    public TeamListDto.Response createTeam(TeamListDto.CreateRequest request, Long userId) {
        UserAccount creator = findUserById(userId);

        // 팀 이름 중복 체크
        if (teamRepository.existsByName(request.name())) {
            throw new IllegalStateException("이미 존재하는 팀 이름입니다: " + request.name());
        }

        // 1) 팀 생성
        Team newTeam = Team.builder()
                .name(request.name())
                .description(request.description())
                .build();
        teamRepository.save(newTeam);

        // 2) 팀 생성자를 리더로 추가 (모든 역할)
        TeamMemberId id = new TeamMemberId(newTeam.getId(), creator.getId());
        TeamMember leader = TeamMember.builder()
                .id(id)
                .team(newTeam)
                .user(creator)
                .roleInTeam(TeamRole.LEADER.name())
                .build();
        teamMemberRepository.save(leader);

        // 3) 자동 프로젝트 생성 제거 (중요!)

        // 4) 응답 매핑
        return convertToDto(newTeam);
    }


    /** 팀원 초대 요청: /api/teams/{teamId}/invitations */
    @Transactional
    public void inviteMember(Long teamId, Long inviteeId, Long requesterId) {
        UserAccount requester = findUserById(requesterId);
        if (requester.getRole() != Role.ADMIN) {
            checkMemberPermission(teamId, requesterId);
        }

        Team team = findTeamById(teamId);
        UserAccount invitee = findUserById(inviteeId);
        UserAccount inviter = findUserById(requesterId);

        if (invitee.getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("학생 역할의 사용자만 팀원으로 초대할 수 있습니다.");
        }
        if (teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, inviteeId)) {
            throw new IllegalStateException("해당 사용자는 이미 팀에 속해있습니다.");
        }
        if (teamInvitationRepository.existsByTeam_IdAndInvitee_IdAndStatus(teamId, inviteeId, RequestStatus.PENDING)) {
            throw new IllegalStateException("이미 해당 사용자에게 초대 요청을 보냈습니다.");
        }

        TeamInvitation invitation = TeamInvitation.builder()
                .team(team)
                .invitee(invitee)
                .inviter(inviter)
                .status(RequestStatus.PENDING)
                .build();
        teamInvitationRepository.save(invitation);

        String message = String.format("'%s'님이 '%s' 팀으로 초대했습니다.", inviter.getName(), team.getName());
        notificationService.createNotification(
                invitee,
                inviter,
                NotificationType.TEAM_INVITATION,
                "팀원 초대 요청",
                message,
                invitation.getId()
        );
    }

    /** 팀원 초대 요청 수락/거절: /api/teams/invitations/{invitationId} */
    @Transactional
    public TeamInvitationDto respondToInvitation(Long invitationId, boolean isAccepted, Long inviteeId) {
        TeamInvitation invitation = teamInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new EntityNotFoundException("초대 요청을 찾을 수 없습니다."));

        if (!invitation.getInvitee().getId().equals(inviteeId)) {
            throw new AccessDeniedException("권한이 없습니다.");
        }
        if (invitation.getStatus() != RequestStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 요청입니다.");
        }

        UserAccount invitee = invitation.getInvitee();
        UserAccount inviter = invitation.getInviter();
        Team team = invitation.getTeam();
        String message;

        if (isAccepted) {
            invitation.setStatus(RequestStatus.ACCEPTED);
            saveTeamMember(team.getId(), inviteeId);
            message = String.format("'%s'님이 '%s' 팀 초대를 수락했습니다.", invitee.getName(), team.getName());
            notificationService.createNotification(
                    inviter,
                    invitee,
                    NotificationType.INVITATION_ACCEPTED,
                    "팀원 초대 수락",
                    message,
                    invitation.getTeam().getId()
            );
        } else {
            invitation.setStatus(RequestStatus.REJECTED);
            message = String.format("'%s'님이 '%s' 팀 초대를 거절했습니다.", invitee.getName(), team.getName());
            notificationService.createNotification(
                    inviter,
                    invitee,
                    NotificationType.INVITATION_REJECTED,
                    "팀원 초대 거절",
                    message,
                    invitation.getTeam().getId()
            );
        }
        notificationService.markInvitationNotificationAsRead(invitationId);
        TeamInvitation savedInvitation = teamInvitationRepository.save(invitation);

        return TeamInvitationDto.from(savedInvitation);
    }

    /** (교수) 공지 보내기: /api/teams/{teamId}/announcements */
    @Transactional
    public void sendAnnouncementToTeam(Long teamId, AnnouncementRequest request, Long professorId) {
        List<UserAccount> studentMembers = teamMemberRepository.findUsersByTeamIdAndRole(teamId, Role.STUDENT);

        if (studentMembers.isEmpty()) {
            throw new IllegalStateException("공지를 보낼 학생이 없습니다.");
        }

        Team team = findTeamById(teamId);
        UserAccount professor = findUserById(professorId);
        Announcement announcement = Announcement.builder()
                .team(team)
                .author(professor)
                .title(request.title())
                .content(request.content())
                .build();

        String message = String.format("팀 공지: %s", request.title());

        for (UserAccount member : studentMembers) {
            notificationService.createNotification(
                    member,
                    professor,
                    NotificationType.TEAM_ANNOUNCEMENT,
                    message,
                    request.content(),
                    team.getId()
            );
        }
    }

    /** 팀 정보 수정: /api/teams/{teamId} */
    @Transactional
    public TeamListDto.Response updateTeamInfo(Long teamId, TeamListDto.UpdateRequest request, Long requesterId) {
        checkLeaderPermission(teamId, requesterId);
        Team team = findTeamById(teamId);
        team.setName(request.name());
        team.setDescription(request.description());
        return convertToDto(team);
    }

    /** 팀 리더 변경: /api/teams/{teamId}/leader */
    @Transactional
    public void changeLeader(Long teamId, Long newLeaderId, Long requesterId) {
        if (Objects.equals(requesterId, newLeaderId)) return;

        TeamMember oldLeader = teamMemberRepository.findByTeamIdAndRoleInTeam(teamId, "LEADER")
                .orElseThrow(() -> new IllegalStateException("현재 팀의 팀장 정보를 찾을 수 없습니다."));

        if (!oldLeader.getUser().getId().equals(requesterId)) {
            throw new IllegalStateException("팀장 정보가 변경되었습니다. 페이지를 새로고침 후 다시 시도해주세요.");
        }

        TeamMember newLeader = findTeamMemberById(teamId, newLeaderId);

        oldLeader.setRoleInTeam(TeamRole.MEMBER.name());
        newLeader.setRoleInTeam(TeamRole.LEADER.name());
    }

    /** 팀원 삭제: /api/teams/{teamId}/members/{memberId} */
    @Transactional
    public void removeMember(Long teamId, Long memberId, Long requesterId) {
        checkLeaderPermission(teamId, requesterId);
        TeamMember member = findTeamMemberById(teamId, memberId);

        if (toRole(member.getRoleInTeam()) == TeamRole.LEADER) {
            throw new IllegalStateException("팀 리더는 팀에서 삭제할 수 없습니다. 먼저 리더를 변경해주세요.");
        }
        teamMemberRepository.delete(member);
    }

    /** 팀 삭제: /api/teams/{teamId} */
    @Transactional
    public void deleteTeam(Long teamId, Long requesterId) {
        checkLeaderPermission(teamId, requesterId);

        // 프로젝트 연결 여부 확인 (연결되어 있으면 삭제 불가)
        if (projectRepository.findByTeam_Id(teamId).isPresent()) {
            throw new IllegalStateException("프로젝트가 있는 팀은 삭제할 수 없습니다.");
        }
        teamMemberRepository.deleteByTeamId(teamId);
        teamRepository.deleteById(teamId);
    }

    /** 모든 교수 목록 조회 */
    public List<UserDto> getAllProfessors() {
        List<UserAccount> professors = userRepository.findByRole(Role.PROFESSOR);
        return professors.stream()
                .map(prof -> new UserDto(prof.getId(), prof.getName(), prof.getEmail()))
                .toList();
    }

    /** 팀에 교수 추가 */
    @Transactional
    public void addProfessorToTeam(Long teamId, Long professorId, Long requesterId) {
        // 팀 존재 확인
        Team team = findTeamById(teamId);

        // 요청자가 팀 멤버인지 확인
        boolean isRequesterMember = teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, requesterId);
        if (!isRequesterMember) {
            throw new AccessDeniedException("팀 멤버만 교수를 추가할 수 있습니다.");
        }

        // 교수 존재 및 권한 확인
        UserAccount professor = findUserById(professorId);
        if (professor.getRole() != Role.PROFESSOR) {
            throw new IllegalArgumentException("해당 사용자는 교수가 아닙니다.");
        }

        // 이미 팀에 있는지 확인
        boolean isAlreadyMember = teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, professorId);
        if (isAlreadyMember) {
            throw new IllegalStateException("이미 팀에 소속된 교수입니다.");
        }

        // 교수를 팀 멤버로 추가 (일반 멤버로)
        TeamMember newMember = TeamMember.builder()
                .id(new TeamMemberId(teamId, professorId))
                .team(team)
                .user(professor)
                .roleInTeam("MEMBER")
                .build();

        teamMemberRepository.save(newMember);
    }

    /** 모든 팀에서 교수/강사 권한을 가진 멤버들 제거 */
    @Transactional
    public int removeProfessorsAndTAsFromAllTeams() {
        // 제거할 권한 목록
        List<Role> rolesToRemove = Arrays.asList(Role.PROFESSOR, Role.TA);

        // 제거하기 전에 해당 멤버들을 조회해서 로그 출력
        List<TeamMember> membersToRemove = teamMemberRepository.findMembersByUserRole(rolesToRemove);

        if (membersToRemove.isEmpty()) {
            return 0;
        }

        // 제거할 멤버들 정보 출력 (디버깅용)
        System.out.println("=== 팀에서 제거될 교수/강사 멤버들 ===");
        for (TeamMember member : membersToRemove) {
            System.out.printf("팀 ID: %d, 사용자: %s (%s), 권한: %s%n",
                    member.getTeam().getId(),
                    member.getUser().getName() != null ? member.getUser().getName() : member.getUser().getEmail(),
                    member.getUser().getEmail(),
                    member.getUser().getRole()
            );
        }

        // 실제 삭제 실행
        teamMemberRepository.deleteMembersByUserRole(rolesToRemove);

        return membersToRemove.size();
    }

    /** 팀원을 데이터베이스에 저장하는 메서드 */
    private void saveTeamMember(Long teamId, Long userId) {
        if (teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, userId)) {
            throw new IllegalStateException("해당 사용자는 이미 팀에 속해있습니다.");
        }

        Team team = findTeamById(teamId);
        UserAccount user = findUserById(userId);
        TeamMemberId teamMemberId = new TeamMemberId(teamId, userId);

        TeamMember newTeamMember = TeamMember.builder()
                .id(teamMemberId)
                .team(team)
                .user(user)
                .roleInTeam("MEMBER")
                .build();

        teamMemberRepository.save(newTeamMember);
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