package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.RequestStatus;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TeamInvitationRepository extends JpaRepository<TeamInvitation, Long> {
    // 특정 사용자(학생)가 받은 모든 초대 요청을 찾는 메서드
    List<TeamInvitation> findByInvitee_Id(Long userId);

    List<TeamInvitation> findByTeam_IdAndStatus(Long teamId, RequestStatus status);

    Optional<TeamInvitation> findByTeam_IdAndInvitee_IdAndStatus(Long teamId, Long inviteeId, RequestStatus status);

    boolean existsByTeam_IdAndInvitee_IdAndStatus(Long teamId, Long inviteeId, RequestStatus status);
}