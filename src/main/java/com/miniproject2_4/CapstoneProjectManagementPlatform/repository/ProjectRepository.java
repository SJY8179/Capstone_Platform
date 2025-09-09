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

    // ★ 핵심: 팀을 fetch join 해서 컨트롤러에서 team 접근 시 LAZY 예외가 안 나게 함
    @Query("""
        select distinct p
          from Project p
          left join fetch p.team t
         where exists (
               select 1
                 from TeamMember tm
                where tm.team = p.team
                  and tm.user.id = :userId
         )
    """)
    List<Project> findAllByMemberUserId(@Param("userId") Long userId);
}