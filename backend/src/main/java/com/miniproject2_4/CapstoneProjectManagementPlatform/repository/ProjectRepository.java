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

    /** 내가 속한 프로젝트 (팀 fetch join) */
    @Query("""
        select distinct p
          from Project p
          left join fetch p.team t
         where exists (
               select 1
                 from com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember tm
                where tm.team = p.team
                  and tm.user.id = :userId
         )
    """)
    List<Project> findAllByMemberUserId(@Param("userId") Long userId);

    /**
     *    교수(담당자)로 지정된 프로젝트 (project.professor_id 사용)
     *  - 팀 멤버 여부와 무관하게 교수 매핑으로 판단
     *  - 팀을 fetch join하여 Lazy 문제 방지
     */
    @Query("""
        select distinct p
          from Project p
          left join fetch p.team t
          left join p.professor prof
         where prof.id = :userId
    """)
    List<Project> findAllByProfessorUserId(@Param("userId") Long userId);

    /** (선택) 파생 쿼리도 필요하면 사용 가능 – fetch join은 안 걸림 */
    List<Project> findAllByProfessor_Id(Long userId);
}
