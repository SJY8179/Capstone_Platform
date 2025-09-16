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
        where p.archived = false
    """)
    List<Project> findAllWithTeam();

    /** 상세 화면용: team/professor fetch-join */
    @Query("""
        select p
          from Project p
          left join fetch p.team t
          left join fetch p.professor prof
         where p.id = :id
    """)
    Optional<Project> findByIdWithTeamAndProfessor(@Param("id") Long id);

    /** 동일 팀의 여러 프로젝트 중 가장 최근 생성된 하나를 선택 */
    Optional<Project> findTopByTeam_IdOrderByCreatedAtDesc(Long teamId);

    /** TeamService에서 사용하는 파생 쿼리: team_id로 단건 조회(Optional) */
    Optional<Project> findByTeam_Id(Long teamId);

    /** 담당교수 여부를 즉시 판정 (엔티티 로딩 없이 EXISTS) */
    boolean existsByIdAndProfessor_Id(Long projectId, Long userId);

    /** 내가 속한 프로젝트 (팀 fetch join) */
    @Query("""
        select distinct p
          from Project p
          left join fetch p.team t
         where p.archived = false
           and exists (
               select 1
                 from com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember tm
                where tm.team = p.team
                  and tm.user.id = :userId
         )
    """)
    List<Project> findAllByMemberUserId(@Param("userId") Long userId);

    /**
     * 교수(담당자)로 지정된 프로젝트 (project.professor_id 사용)
     * - 팀 멤버 여부와 무관하게 교수 매핑으로 판단
     * - 팀을 fetch join하여 Lazy 문제 방지
     */
    @Query("""
        select distinct p
          from Project p
          left join fetch p.team t
          left join p.professor prof
         where p.archived = false
           and prof.id = :userId
    """)
    List<Project> findAllByProfessorUserId(@Param("userId") Long userId);

    /** (선택) 파생 쿼리도 필요하면 사용 가능 – fetch join은 안 걸림 */
    List<Project> findAllByProfessor_Id(Long userId);

    /** Archive/restore operations - finds by status (active/archived) */
    @Query("""
        select p from Project p
        join fetch p.team t
        where p.archived = :archived
    """)
    List<Project> findAllWithTeamByArchived(@Param("archived") Boolean archived);

    /** Archive specific queries for user roles */
    @Query("""
        select distinct p
          from Project p
          left join fetch p.team t
         where p.archived = :archived
           and exists (
               select 1
                 from com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember tm
                where tm.team = p.team
                  and tm.user.id = :userId
         )
    """)
    List<Project> findAllByMemberUserIdAndArchived(@Param("userId") Long userId, @Param("archived") Boolean archived);

    @Query("""
        select distinct p
          from Project p
          left join fetch p.team t
          left join p.professor prof
         where p.archived = :archived
           and prof.id = :userId
    """)
    List<Project> findAllByProfessorUserIdAndArchived(@Param("userId") Long userId, @Param("archived") Boolean archived);

    /** 추가: 활성(archived=false) 프로젝트 수 */
    long countByProfessor_Id(Long userId);
}