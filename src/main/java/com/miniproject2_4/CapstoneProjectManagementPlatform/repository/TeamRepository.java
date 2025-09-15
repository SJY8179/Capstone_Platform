package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {

    /** 내가 '팀 멤버'로 속한 팀 */
    @Query(value = """
        SELECT t.* 
          FROM team t
          JOIN team_member tm ON tm.team_id = t.id
         WHERE tm.user_id = :userId
        """, nativeQuery = true)
    List<Team> findAllByMemberUserId(@Param("userId") Long userId);

    /** 내가 '담당 교수'로 지정된 프로젝트의 팀 */
    @Query("""
        select distinct t
          from Team t
          join Project p on p.team = t
         where p.professor.id = :userId
    """)
    List<Team> findAllByProfessorUserId(@Param("userId") Long userId);
}
