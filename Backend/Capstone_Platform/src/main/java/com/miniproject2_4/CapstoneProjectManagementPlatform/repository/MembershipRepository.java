package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * 프로젝트-사용자 소속 여부 확인 전용 리포지토리.
 * 스키마: project(team_id) ←→ team_member(team_id)
 */
@Repository
public class MembershipRepository {

    @PersistenceContext
    private EntityManager em;

    /**
     * 사용자가 해당 프로젝트의 팀에 속해있는지 여부
     * project.team_id 와 team_member.team_id 를 직접 조인
     */
    @Transactional(readOnly = true)
    public boolean existsMembership(Long projectId, Long userId) {
        Object result = em.createNativeQuery("""
                SELECT COUNT(*)
                  FROM project p
                  JOIN team_member tm ON tm.team_id = p.team_id
                 WHERE p.id       = ?1
                   AND tm.user_id = ?2
                """)
                .setParameter(1, projectId)
                .setParameter(2, userId)
                .getSingleResult();

        long cnt = (result instanceof Number)
                ? ((Number) result).longValue()
                : Long.parseLong(String.valueOf(result));
        return cnt > 0L;
    }
}