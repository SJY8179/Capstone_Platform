package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmail(String email);

    /** 이름/이메일 부분 일치 검색 */
    List<UserAccount> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email);

    /** 특정 권한을 가진 첫 번째 사용자 조회 */
    Optional<UserAccount> findFirstByRole(Role role);

    /** 특정 권한을 가진 모든 사용자 조회 */
    List<UserAccount> findByRole(Role role);

    /** 역할별 집계 */
    long countByRole(Role role);

    /** 최근 로그인 기준 활성 사용자 수 */
    long countByLastLoginAtAfter(LocalDateTime since);

    /** 관리자 검색/필터(페이지네이션) */
    @Query("""
        select u from UserAccount u
        where (:role is null or u.role = :role)
          and (:q is null or lower(u.name) like lower(concat('%', :q, '%'))
                         or lower(u.email) like lower(concat('%', :q, '%')))
        order by u.createdAt desc
    """)
    Page<UserAccount> search(@Param("q") String q,
                             @Param("role") Role role,
                             Pageable pageable);
    @Query("SELECT u FROM UserAccount u WHERE u.role = :role AND u.id NOT IN :excludedIds")
    List<UserAccount> findByRoleAndIdNotIn(@Param("role") Role role,
                                           @Param("excludedIds") Collection<Long> excludedIds);
}
