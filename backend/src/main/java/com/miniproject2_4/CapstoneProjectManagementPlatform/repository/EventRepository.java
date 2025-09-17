package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Event;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {

    /**
     * 겹침(overlap) 조건:
     *   e.startAt < :toExclusive  AND  (e.endAt IS NULL OR e.endAt >= :fromInclusive)
     * 으로 구현. endAt == NULL(종료 미지정)도 포함되도록 처리.
     */
    @Query("""
      select e
      from Event e
      where e.project.id = :projectId
        and e.startAt < :toExclusive
        and (e.endAt is null or e.endAt >= :fromInclusive)
      order by e.startAt asc
    """)
    List<Event> findInRange(@Param("projectId") Long projectId,
                            @Param("fromInclusive") LocalDateTime fromInclusive,
                            @Param("toExclusive") LocalDateTime toExclusive);

    long countByProject_IdAndType(Long projectId, EventType type);

    List<Event> findByProject_IdOrderByStartAtAsc(Long projectId);

    List<Event> findByProject_IdAndStartAtBetweenOrderByStartAtAsc(
            Long projectId, LocalDateTime from, LocalDateTime to);

    /** 추가: 전 프로젝트 대상 최신 활동 (관리자 대시보드) */
    List<Event> findByProject_ArchivedFalseOrderByStartAtDesc(Pageable pageable);
}