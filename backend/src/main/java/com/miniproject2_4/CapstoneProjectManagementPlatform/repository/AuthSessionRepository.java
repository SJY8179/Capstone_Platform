package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AuthSession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {

    Optional<AuthSession> findByRefreshToken(String refreshToken);

    @EntityGraph(attributePaths = "user")  // refresh 시 LAZY 로딩 문제 방지
    Optional<AuthSession> findWithUserByRefreshToken(String refreshToken);

    void deleteByRefreshToken(String refreshToken);
}