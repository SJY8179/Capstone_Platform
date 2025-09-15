package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_token",
        indexes = {
                @Index(name = "idx_password_reset_token_hash", columnList = "tokenHash", unique = true),
                @Index(name = "idx_password_reset_token_user_expires", columnList = "userId, expiresAt"),
                @Index(name = "idx_password_reset_token_expires_used", columnList = "expiresAt, used")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordResetToken extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", length = 255, nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used", nullable = false)
    @Builder.Default
    private Boolean used = false;

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private Integer attempts = 0;

    @Column(name = "created_ip", length = 45)
    private String createdIp;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserAccount user;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isUsed() {
        return used;
    }

    public void markAsUsed() {
        this.used = true;
    }

    public void incrementAttempts() {
        this.attempts++;
    }
}