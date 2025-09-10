package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TeamRepository extends JpaRepository<Team, Long> {

    @Query(value = """
        SELECT t.* 
          FROM team t
          JOIN team_member tm ON tm.team_id = t.id
         WHERE tm.user_id = :userId
        """, nativeQuery = true)
    List<Team> findAllByMemberUserId(@Param("userId") Long userId);
}