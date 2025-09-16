package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMemberId;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMember, TeamMemberId> {

    long countByTeam_Id(Long teamId);

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

    /** 학생의 최근 프로젝트 제목 목록 (최신순) */
    @Query("""
        select p.title
          from Project p
         where p.archived = false
           and p.team.id in (
                select tm.team.id
                  from TeamMember tm
                 where tm.user.id = :userId
           )
         order by p.createdAt desc
    """)
    List<String> findRecentProjectTitles(@Param("userId") Long userId);

    /**
     * 팀 ID와 역할로 팀원 및 팀원의 사용자 정보 조회
     * @param teamId 팀 ID
     * @param roleInTeam 조회할 역할 (예: "LEADER")
     * @return TeamMember Optional 객체
     */
    @Query("""
            SELECT tm FROM TeamMember tm JOIN FETCH tm.user u
            WHERE tm.team.id = :teamId
            AND tm.roleInTeam = :roleInTeam
    """)
    Optional<TeamMember> findByTeamIdAndRoleInTeam(@Param("teamId") Long teamId,
                                                   @Param("roleInTeam") String roleInTeam);
    /**
     * 특정 팀에서 특정 역할을 가진 모든 사용자의 정보 목록을 조회
     * @param teamId 팀의 ID
     * @param userRole 사용자의 역할 (예: Role.STUDENT)
     * @return 조건에 맞는 UserAccount 엔티티 리스트
     */
    @Query("""
        SELECT tm.user FROM TeamMember tm
        WHERE tm.team.id = :teamId
        AND tm.user.role = :userRole
    """)
    List<UserAccount> findUsersByTeamIdAndRole(@Param("teamId") Long teamId, @Param("userRole") Role userRole);

    /** TeamId로 팀원 삭제 */
    @Modifying
    @Query("DELETE FROM TeamMember tm WHERE tm.id.teamId = :teamId")
    void deleteByTeamId(@Param("teamId") Long teamId);
}