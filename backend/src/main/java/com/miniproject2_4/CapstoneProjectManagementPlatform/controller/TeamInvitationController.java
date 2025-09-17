package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.MemberReq;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.TeamInvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping
public class TeamInvitationController {

    private final TeamInvitationService invitationService;

    /** 팀원 초대 요청 생성 */
    @PostMapping("/teams/{teamId}/invitations")
    public ResponseEntity<Void> createInvitation(
            @PathVariable Long teamId,
            @RequestBody MemberReq req,
            @AuthenticationPrincipal UserAccount me
    ) {
        invitationService.invite(teamId, req.userId(), me.getId(), null);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /** 초대 수락 */
    @PostMapping("/invitations/{invitationId}/accept")
    public ResponseEntity<Void> accept(
            @PathVariable Long invitationId,
            @AuthenticationPrincipal UserAccount me
    ) {
        invitationService.accept(invitationId, me.getId());
        return ResponseEntity.ok().build();
    }

    /** 초대 거절 */
    @PostMapping("/invitations/{invitationId}/decline")
    public ResponseEntity<Void> decline(
            @PathVariable Long invitationId,
            @AuthenticationPrincipal UserAccount me
    ) {
        invitationService.decline(invitationId, me.getId());
        return ResponseEntity.ok().build();
    }
}
