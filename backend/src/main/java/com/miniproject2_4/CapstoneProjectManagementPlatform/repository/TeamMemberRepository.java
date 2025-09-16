package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMemberId;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount; // ⬅ 추가 import
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamMemberRepository extends JpaRepository<TeamMember, TeamMemberId> {

    long countByTeam_Id(Long teamId);

    boolean existsByTeam_IdAndUser_Id(Long teamId, Long userId);

    @Query("""
        select tm
          from TeamMember tm
          join fetch tm.user u
         where tm.team.id = :teamId
         order by u.name asc
    """)
    List<TeamMember> findWithUserByTeamId(@Param("teamId") Long teamId);

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

    @Modifying
    @Query("DELETE FROM TeamMember tm WHERE tm.id.teamId = :teamId")
    void deleteByTeamId(@Param("teamId") Long teamId);

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

    /** ⬅⬅⬅ 여기 추가: 팀의 특정 역할 사용자 목록 (교수 목록 등) */
    @Query("""
        select tm.user
          from TeamMember tm
         where tm.team.id = :teamId
           and tm.user.role = :role
         order by tm.user.name asc
    """)
    List<UserAccount> findUsersByTeamIdAndRole(@Param("teamId") Long teamId,
                                               @Param("role") Role role);
}
