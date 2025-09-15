package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 프로젝트-사용자 소속 여부 확인 전용 리포지토리.
 * project(team_id) ←→ team_member(team_id)
 *
 * ProjectAccessGuard 에서 existsMembership(projectId, userId) 를 사용합니다.
 */
public interface MembershipRepository extends JpaRepository<TeamMember, TeamMemberId> {

    /**
     * 사용자가 해당 프로젝트의 팀에 속해있는지 여부
     * tm.team.id = (select p.team.id from Project p where p.id = :projectId)
     */
    @Query("""
        select case when count(tm) > 0 then true else false end
          from TeamMember tm
         where tm.team.id = (select p.team.id from Project p where p.id = :projectId)
           and tm.user.id = :userId
    """)
    boolean existsMembership(@Param("projectId") Long projectId,
                             @Param("userId") Long userId);
}
