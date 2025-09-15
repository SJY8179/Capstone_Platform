package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.AnnouncementRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.InvitableUserDto;
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
    private final TeamInvitationRepository teamInvitationRepository;

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

//        if (memberIds.isEmpty()) {
//            return userRepository.findByRole(Role.STUDENT).stream()
//                    .map(user -> new UserDto(user.getId(), user.getName(), user.getEmail()))
//                    .toList();
//        }

//        return userRepository.findByRoleAndIdNotIn(Role.STUDENT, memberIds).stream()
//                .map(user -> new UserDto(user.getId(), user.getName(), user.getEmail()))
//                .toList();
    }

    /** 팀 생성: 새 팀 + (필요 시) 새 프로젝트 자동 생성: /api/teams */
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
                .roleInTeam("LEADER")
                .build();
        teamMemberRepository.save(creatorAsLeader);

        // 3) 프로젝트 자동 생성
        //    - 생성자가 교수면 담당 교수로 지정
        //    - 그 외(학생/조교/관리자)는 NULL로 두어 DB 트리거 충돌 방지
        UserAccount professor = (creator.getRole() == Role.PROFESSOR) ? creator : null;

        Project newProject = Project.builder()
                .team(newTeam)
                .professor(professor) // null 허용
                .title((request.name() != null && !request.name().isBlank()) ? request.name() : "새 프로젝트")
                .status(Project.Status.ACTIVE)
                .build();
        projectRepository.save(newProject);

        return convertToDto(newTeam);
    }

    /** 팀원 초대 요청: /api/teams/{teamId}/invitations */
    @Transactional
    public void inviteMember(Long teamId, Long inviteeId, Long requesterId) {
        checkMemberPermission(teamId, requesterId);

        Team team = findTeamById(teamId);
        UserAccount invitee = findUserById(inviteeId);

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
                .status(RequestStatus.PENDING)
                .build();
        teamInvitationRepository.save(invitation);

        // [알림 로직] 초대받은 학생에게 알림 보내기
        // notificationService.sendNotification(invitee, team.getName() + " 팀에서 당신을 초대했습니다.");
    }

    /** 팀원 초대 요청 수락/거절: /api/teams/invitations/{invitationId} */
    @Transactional
    public TeamInvitation respondToInvitation(Long invitationId, boolean isAccepted, Long inviteeId) {
        TeamInvitation invitation = teamInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new EntityNotFoundException("초대 요청을 찾을 수 없습니다."));

        if (!invitation.getInvitee().getId().equals(inviteeId)) {
            throw new AccessDeniedException("권한이 없습니다.");
        }
        if (invitation.getStatus() != RequestStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 요청입니다.");
        }

        Team team = invitation.getTeam();
        UserAccount teamLeader = teamMemberRepository.findByTeamIdAndRoleInTeam(team.getId(), "LEADER")
                .map(TeamMember::getUser)
                .orElseThrow(() -> new EntityNotFoundException("팀장을 찾을 수 없습니다."));

        if (isAccepted) {
            invitation.setStatus(RequestStatus.ACCEPTED);
            saveTeamMember(team.getId(), inviteeId);

            // [알림 로직] 팀장에게 수락 알림 보내기
            // notificationService.sendNotification(teamLeader, invitation.getInvitee().getName() + " 님이 팀 초대를 수락했습니다.");
        } else {
            invitation.setStatus(RequestStatus.REJECTED);
            // [알림 로직] 팀장에게 거절 알림 보내기
            // notificationService.sendNotification(teamLeader, invitation.getInvitee().getName() + " 님이 팀 초대를 거절했습니다.");
        }

        return invitation;
    }

    /** (교수) 공지 보내기: /api/teams/{teamId}/announcements */
    public void sendAnnouncementToTeam(Long teamId, AnnouncementRequest request, Long professorId) {
        List<UserAccount> studentMembers = teamMemberRepository.findUsersByTeamIdAndRole(teamId, Role.STUDENT);

        if (studentMembers.isEmpty()) {
            throw new IllegalStateException("공지를 보낼 학생이 없습니다.");
        }

        // 3. 각 학생에게 알림 발송
        // (NotificationService는 DB에 알림을 저장하거나 WebSocket으로 실시간 전송하는 역할을 함)
//        for (UserAccount student : studentMembers) {
//            notificationService.sendNotification(
//                    student, // 알림을 받을 사람
//                    request.title(), // 공지 제목
//                    request.content()  // 공지 내용
//            );
//        }
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
        if (requesterId.equals(newLeaderId)) return;

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
            throw new AccessDeniedException("팀의 리더만 이 작업을 수행할 수 있습니다.");
        }
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
