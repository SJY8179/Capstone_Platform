package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamInvitation;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamInvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamInvitationRepository extends JpaRepository<TeamInvitation, Long> {
    Optional<TeamInvitation> findByIdAndInvitee_Id(Long id, Long inviteeId);
    boolean existsByTeam_IdAndInvitee_IdAndStatus(Long teamId, Long inviteeId, TeamInvitationStatus status);
    List<TeamInvitation> findTop50ByInvitee_IdAndStatusOrderByCreatedAtDesc(Long inviteeId, TeamInvitationStatus status);
}
