package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Decision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DecisionRepository extends JpaRepository<Decision, Long> {

    // (기존 메서드: 다른 코드가 참조할 수 있어 보존)
    List<Decision> findByProject_IdOrderByIdDesc(Long projectId);

    // 프로젝트별 목록을 project/decidedBy까지 함께 로딩 (open-in-view=false에서도 안전)
    @Query("""
           select d
             from Decision d
             left join fetch d.project p
             left join fetch d.decidedBy u
            where p.id = :projectId
            order by d.id desc
           """)
    List<Decision> findByProjectIdWithRefs(@Param("projectId") Long projectId);

    // 단건 조회도 연관을 함께 로딩 (PATCH 응답 매핑 시 Lazy 예외 방지)
    @Query("""
           select d
             from Decision d
             left join fetch d.project p
             left join fetch d.decidedBy u
            where d.id = :id
           """)
    Optional<Decision> findByIdWithRefs(@Param("id") Long id);
}
