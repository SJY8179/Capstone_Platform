package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeamInvitationService {

    private final TeamInvitationRepository invitationRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /** 초대 생성(팀 멤버 또는 관리자만 가능) */
    @Transactional
    public void invite(Long teamId, Long inviteeUserId, Long requesterId, String message) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new EntityNotFoundException("팀 없음: " + teamId));
        UserAccount invitee = userRepository.findById(inviteeUserId)
                .orElseThrow(() -> new EntityNotFoundException("사용자 없음: " + inviteeUserId));
        UserAccount requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new EntityNotFoundException("요청자 없음: " + requesterId));

        boolean requesterAllowed = requester.getRole() == Role.ADMIN
                || teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, requesterId);
        if (!requesterAllowed) throw new AccessDeniedException("팀 멤버만 초대할 수 있습니다.");

        if (teamMemberRepository.existsByTeam_IdAndUser_Id(teamId, inviteeUserId)) {
            throw new IllegalStateException("이미 팀에 속해있는 사용자입니다.");
        }
        // 학생만 팀 합류 허용(트리거와 일치)
        if (invitee.getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("학생만 팀에 초대할 수 있습니다.");
        }
        // 중복 PENDING 방지
        if (invitationRepository.existsByTeam_IdAndInvitee_IdAndStatus(teamId, inviteeUserId, TeamInvitationStatus.PENDING)) {
            throw new IllegalStateException("이미 대기 중인 초대가 있습니다.");
        }

        TeamInvitation inv = TeamInvitation.builder()
                .team(team)
                .inviter(requester)
                .invitee(invitee)
                .status(TeamInvitationStatus.PENDING)
                .message(message)
                .createdAt(LocalDateTime.now())
                .build();
        invitationRepository.save(inv);

        // 수신자에게 알림
        notificationService.push(inviteeUserId,
                NotificationType.TEAM_INVITATION,
                "팀원 초대 요청",
                String.format("'%s'님이 '%s' 팀으로 초대했습니다.", requester.getName(), team.getName()),
                Map.of("invitationId", inv.getId(), "teamId", team.getId(), "teamName", team.getName()));
    }

    /** 수락 */
    @Transactional
    public void accept(Long invitationId, Long userId) {
        TeamInvitation inv = invitationRepository.findByIdAndInvitee_Id(invitationId, userId)
                .orElseThrow(() -> new EntityNotFoundException("초대를 찾을 수 없습니다."));
        if (inv.getStatus() != TeamInvitationStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 초대입니다.");
        }

        // 팀원 등록(멤버)
        TeamMemberId id = new TeamMemberId(inv.getTeam().getId(), inv.getInvitee().getId());
        if (!teamMemberRepository.existsById(id)) {
            TeamMember member = TeamMember.builder()
                    .id(id)
                    .team(inv.getTeam())
                    .user(inv.getInvitee())
                    .roleInTeam(TeamRole.MEMBER.name())
                    .build();
            teamMemberRepository.save(member);
        }

        inv.setStatus(TeamInvitationStatus.ACCEPTED);
        inv.setDecidedAt(LocalDateTime.now());

        // 초대한 사람에게 알림
        notificationService.push(inv.getInviter().getId(),
                NotificationType.INVITATION_ACCEPTED,
                "팀원 초대 수락",
                String.format("'%s'님이 '%s' 팀 초대를 수락했습니다.", inv.getInvitee().getName(), inv.getTeam().getName()),
                Map.of("teamId", inv.getTeam().getId(), "inviteeId", inv.getInvitee().getId()));
    }

    /** 거절 */
    @Transactional
    public void decline(Long invitationId, Long userId) {
        TeamInvitation inv = invitationRepository.findByIdAndInvitee_Id(invitationId, userId)
                .orElseThrow(() -> new EntityNotFoundException("초대를 찾을 수 없습니다."));
        if (inv.getStatus() != TeamInvitationStatus.PENDING) {
            throw new IllegalStateException("이미 처리된 초대입니다.");
        }
        inv.setStatus(TeamInvitationStatus.DECLINED);
        inv.setDecidedAt(LocalDateTime.now());

        notificationService.push(inv.getInviter().getId(),
                NotificationType.INVITATION_DECLINED,
                "팀원 초대 거절",
                String.format("'%s'님이 '%s' 팀 초대를 거절했습니다.", inv.getInvitee().getName(), inv.getTeam().getName()),
                Map.of("teamId", inv.getTeam().getId(), "inviteeId", inv.getInvitee().getId()));
    }
}
