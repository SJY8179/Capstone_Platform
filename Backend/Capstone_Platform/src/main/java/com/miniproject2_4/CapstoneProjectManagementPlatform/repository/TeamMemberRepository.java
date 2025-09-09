package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, TeamMemberId> {

    List<TeamMember> findByTeam_Id(Long teamId);

    long countByTeam_Id(Long teamId);

    @Query("""
       select tm from TeamMember tm
       join fetch tm.user u
       where tm.team.id = :teamId
    """)
    List<TeamMember> findWithUserByTeamId(@Param("teamId") Long teamId);
}