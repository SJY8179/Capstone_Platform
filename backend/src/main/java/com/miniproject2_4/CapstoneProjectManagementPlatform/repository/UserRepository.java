package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserAccount, Long> {
    Optional<UserAccount> findByEmail(String email);

    /** 이름/이메일 부분 일치 검색 */
    List<UserAccount> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email);
}
