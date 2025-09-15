package com.miniproject2_4.CapstoneProjectManagementPlatform.repository;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    List<PasswordResetToken> findByUserIdAndUsedFalseAndExpiresAtAfter(Long userId, LocalDateTime now);

    @Modifying
    @Query("UPDATE PasswordResetToken p SET p.used = true WHERE p.userId = :userId AND p.used = false")
    void invalidateAllTokensForUser(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM PasswordResetToken p WHERE p.expiresAt < :now OR p.used = true")
    void deleteExpiredOrUsedTokens(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(p) FROM PasswordResetToken p WHERE p.userId = :userId AND p.createdAt > :since")
    long countRecentTokensForUser(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(p) FROM PasswordResetToken p WHERE p.createdIp = :ip AND p.createdAt > :since")
    long countRecentTokensForIp(@Param("ip") String ip, @Param("since") LocalDateTime since);
}