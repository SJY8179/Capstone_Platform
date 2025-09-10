package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, TeamMemberId> {

    /** 팀 인원 수 */
    long countByTeam_Id(Long teamId);

    /**
     * 팀 구성원 + 사용자 정보까지 함께 로드
     * - TeamService/ProjectService에서 사용
     */
    @Query("""
        select tm
          from TeamMember tm
          join fetch tm.user u
         where tm.team.id = :teamId
         order by u.name asc
    """)
    List<TeamMember> findWithUserByTeamId(@Param("teamId") Long teamId);

    /**
     * 여러 팀에서 "특정 역할(Role)"에 해당하는 고유 사용자 수
     * - 교수 대시보드의 studentCount 집계에 사용
     */
    @Query("""
        select count(distinct tm.user.id)
          from TeamMember tm
         where tm.team.id in :teamIds
           and tm.user.role = :role
    """)
    long countDistinctMembersByTeamIdsAndUserRole(
            @Param("teamIds") List<Long> teamIds,
            @Param("role") Role role
    );
}
