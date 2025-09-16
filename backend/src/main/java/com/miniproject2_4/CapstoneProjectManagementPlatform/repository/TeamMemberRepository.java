package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, TeamMemberId> {

    /** 팀 인원 수 */
    long countByTeam_Id(Long teamId);

    /** 권한검사용: 팀에 해당 사용자가 포함되는지 */
    boolean existsByTeam_IdAndUser_Id(Long teamId, Long userId);

    /**
     * 팀 구성원 + 사용자 정보까지 함께 로드 (이름 오름차순 정렬)
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

    /** TeamId로 팀원 삭제 */
    @Modifying
    @Query("DELETE FROM TeamMember tm WHERE tm.id.teamId = :teamId")
    void deleteByTeamId(@Param("teamId") Long teamId);

    /** 교수/강사 권한을 가진 팀 멤버들 조회 */
    @Query("""
        select tm
          from TeamMember tm
          join fetch tm.user u
         where tm.user.role in (:roles)
         order by tm.team.id, u.name
    """)
    List<TeamMember> findMembersByUserRole(@Param("roles") List<Role> roles);

    /** 특정 권한을 가진 팀 멤버들 삭제 */
    @Modifying
    @Query("DELETE FROM TeamMember tm WHERE tm.user.role in (:roles)")
    void deleteMembersByUserRole(@Param("roles") List<Role> roles);
}
