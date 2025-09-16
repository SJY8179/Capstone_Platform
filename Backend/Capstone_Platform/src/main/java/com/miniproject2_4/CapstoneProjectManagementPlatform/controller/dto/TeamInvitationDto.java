package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.RequestStatus;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamInvitation;
import java.time.LocalDateTime;

public record TeamInvitationDto(
        Long id,
        Long teamId,
        String teamName,
        Long inviterId,
        String inviterName,
        Long inviteeId,
        String inviteeName,
        RequestStatus status,
        LocalDateTime createdAt
) {
    public static TeamInvitationDto from(TeamInvitation entity) {
        return new TeamInvitationDto(
                entity.getId(),
                entity.getTeam().getId(),
                entity.getTeam().getName(),
                entity.getInviter().getId(),
                entity.getInviter().getName(),
                entity.getInvitee().getId(),
                entity.getInvitee().getName(),
                entity.getStatus(),
                entity.getCreatedAt()
        );
    }
}