package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("""
        select p from Project p
        join fetch p.team t
    """)
    List<Project> findAllWithTeam();

    Optional<Project> findFirstByTeam_Id(Long teamId);

    Optional<Project> findByTeam_Id(Long teamId);

    // --- 추가: 해당 사용자(팀 멤버)가 속한 프로젝트 목록 ---
    @Query(value = """
        SELECT p.* 
          FROM project p
          JOIN team_member tm ON tm.team_id = p.team_id
         WHERE tm.user_id = :userId
        """, nativeQuery = true)
    List<Project> findAllByMemberUserId(@Param("userId") Long userId);
}
