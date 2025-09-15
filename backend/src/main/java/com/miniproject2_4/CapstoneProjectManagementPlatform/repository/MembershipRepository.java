package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * 프로젝트-사용자 소속 여부 확인 전용 리포지토리.
 * 스키마: project(team_id) ←→ team_member(team_id)
 *
 * ProjectAccessGuard 등에서 existsMembership(projectId, userId)를 사용합니다.
 */
@Repository
public class MembershipRepository {

    @PersistenceContext
    private EntityManager em;

    /**
     * 사용자가 해당 프로젝트의 팀에 속해있는지 여부.
     *
     * JPQL 버전(인터페이스 구현의 @Query와 동일한 의미):
     *   tm.team.id = (select p.team.id from Project p where p.id = :projectId)
     *   and tm.user.id = :userId
     */
    @Transactional(readOnly = true)
    public boolean existsMembership(Long projectId, Long userId) {
        Long cnt = em.createQuery("""
                select count(tm)
                  from TeamMember tm
                 where tm.team.id = (select p.team.id from Project p where p.id = :projectId)
                   and tm.user.id = :userId
                """, Long.class)
                .setParameter("projectId", projectId)
                .setParameter("userId", userId)
                .getSingleResult();

        return cnt != null && cnt > 0L;
    }

    /**
     * (옵션) teamId가 이미 있는 경우 직접 확인하는 경로.
     *  성능상 유리할 수 있어 추가 제공.
     */
    @Transactional(readOnly = true)
    public boolean existsMembershipByTeamId(Long teamId, Long userId) {
        Long cnt = em.createQuery("""
                select count(tm)
                  from TeamMember tm
                 where tm.team.id = :teamId
                   and tm.user.id = :userId
                """, Long.class)
                .setParameter("teamId", teamId)
                .setParameter("userId", userId)
                .getSingleResult();

        return cnt != null && cnt > 0L;
    }
}
