package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmail(String email);

    /** 이름/이메일 부분 일치 검색 */
    List<UserAccount> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email);

    List<UserAccount> findByRole(Role role);

    @Query("SELECT u FROM UserAccount u WHERE u.role = :role AND u.id NOT IN :excludedIds")
    List<UserAccount> findByRoleAndIdNotIn(@Param("role") Role role,
                                           @Param("excludedIds") Collection<Long> excludedIds);
}
