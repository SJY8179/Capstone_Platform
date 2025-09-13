package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProjectOverview;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProjectOverviewRepository extends JpaRepository<ProjectOverview, Long> {

    // 서비스 변경 없이도 작성자 연관을 즉시 로딩
    @EntityGraph(attributePaths = {"updatedBy", "pendingAuthor"})
    Optional<ProjectOverview> findByProject_Id(Long projectId);

    // fetch join 버전 – 서비스에서 필요 시 이 메서드 사용
    @Query("""
           select o
           from ProjectOverview o
           left join fetch o.updatedBy
           left join fetch o.pendingAuthor
           where o.project.id = :projectId
           """)
    Optional<ProjectOverview> findByProjectIdWithUsers(@Param("projectId") Long projectId);
}
