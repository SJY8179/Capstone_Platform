package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.NotificationDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamInvitationDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.NotificationType;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamInvitation;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.NotificationService;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final TeamService teamService;

    /** 내 알림 목록 조회 */
    @GetMapping
    public ResponseEntity<List<NotificationDto>> getMyNotifications(@AuthenticationPrincipal UserAccount user) {
        List<NotificationDto> notifications = notificationService.getNotificationsForUser(user.getId());
        return ResponseEntity.ok(notifications);
    }

    /** 팀원 초대 응답 (수락/거절) */
    @PostMapping("/invitations/respond")
    public ResponseEntity<TeamInvitationDto> respondToInvitation(
            @RequestBody InvitationResponseRequest request,
            @AuthenticationPrincipal UserAccount user) {
        TeamInvitationDto updatedInvitation = teamService.respondToInvitation(request.invitationId(),
                request.accept(), user.getId());
        return ResponseEntity.ok(updatedInvitation);
    }

    public record InvitationResponseRequest(Long invitationId, boolean accept) {}
}