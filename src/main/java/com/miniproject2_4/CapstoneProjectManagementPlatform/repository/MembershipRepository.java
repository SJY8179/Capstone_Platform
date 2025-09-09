package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

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
    public boolean existsMembership(Long projectId, Long userId) {
        Number cnt = (Number) em.createNativeQuery("""
                SELECT COUNT(*)
                  FROM project p
                  JOIN team_member tm ON tm.team_id = p.team_id
                 WHERE p.id       = :projectId
                   AND tm.user_id = :userId
                """)
                .setParameter("projectId", projectId)
                .setParameter("userId", userId)
                .getSingleResult();
        return cnt != null && cnt.longValue() > 0L;
    }
}
