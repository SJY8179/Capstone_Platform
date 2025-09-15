package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.PasswordResetToken;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.PasswordResetTokenRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private static final int TOKEN_EXPIRY_HOURS = 1;
    private static final int MAX_ATTEMPTS = 5;
    private static final int RATE_LIMIT_PER_USER_HOUR = 3;
    private static final int RATE_LIMIT_PER_IP_HOUR = 10;

    @Transactional
    public void sendForgotId(String email) {
        log.info("Forgot ID request for email: {}", email);

        // 보안을 위해 계정 존재 여부와 관계없이 항상 성공 응답
        Optional<UserAccount> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            UserAccount user = userOpt.get();
            String maskedEmail = maskEmail(user.getEmail());
            emailService.sendForgotIdEmail(email, maskedEmail);
        }
        // 계정이 없어도 같은 응답 시간을 유지하기 위해 의도적으로 딜레이 없음
    }

    @Transactional
    public void createAndSendResetToken(String emailOrUsername, String ip, String userAgent) {
        log.info("Password reset request for: {}", emailOrUsername);

        // IP별 요청 제한 확인
        if (isIpRateLimited(ip)) {
            log.warn("Rate limit exceeded for IP: {}", ip);
            return; // 보안을 위해 예외를 던지지 않고 조용히 무시
        }

        Optional<UserAccount> userOpt = userRepository.findByEmail(emailOrUsername);
        if (userOpt.isEmpty()) {
            log.info("User not found for: {}", emailOrUsername);
            return; // 보안을 위해 계정 존재 여부를 노출하지 않음
        }

        UserAccount user = userOpt.get();

        // 사용자별 요청 제한 확인
        if (isUserRateLimited(user.getId())) {
            log.warn("Rate limit exceeded for user: {}", user.getId());
            return;
        }

        // 기존 유효한 토큰들 무효화
        tokenRepository.invalidateAllTokensForUser(user.getId());

        // 새 토큰 생성
        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .userId(user.getId())
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusHours(TOKEN_EXPIRY_HOURS))
                .createdIp(ip)
                .userAgent(userAgent)
                .build();

        tokenRepository.save(resetToken);

        // 이메일 전송
        emailService.sendPasswordResetEmail(user.getEmail(), rawToken);

        log.info("Password reset token created for user: {}", user.getId());
    }

    @Transactional(readOnly = true)
    public boolean validateToken(String rawToken) {
        if (rawToken == null || rawToken.trim().isEmpty()) {
            return false;
        }

        String tokenHash = hashToken(rawToken);
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByTokenHash(tokenHash);

        if (tokenOpt.isEmpty()) {
            log.warn("Invalid token attempted: {}", tokenHash);
            return false;
        }

        PasswordResetToken token = tokenOpt.get();

        if (token.isUsed() || token.isExpired()) {
            log.warn("Used or expired token attempted: {}", tokenHash);
            return false;
        }

        if (token.getAttempts() >= MAX_ATTEMPTS) {
            log.warn("Token with too many attempts: {}", tokenHash);
            return false;
        }

        return true;
    }

    @Transactional
    public void confirmPasswordReset(String rawToken, String newPassword) {
        String tokenHash = hashToken(rawToken);
        PasswordResetToken token = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 토큰입니다."));

        // 토큰 유효성 재검증
        if (token.isUsed() || token.isExpired()) {
            throw new IllegalArgumentException("만료되거나 이미 사용된 토큰입니다.");
        }

        if (token.getAttempts() >= MAX_ATTEMPTS) {
            throw new IllegalArgumentException("토큰 사용 시도 횟수가 초과되었습니다.");
        }

        // 사용자 조회
        UserAccount user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 비밀번호 변경
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // 토큰 사용 완료 처리
        token.markAsUsed();
        tokenRepository.save(token);

        // 해당 사용자의 모든 토큰 무효화
        tokenRepository.invalidateAllTokensForUser(user.getId());

        // TODO: 모든 세션 무효화 (현재는 JWT 방식이므로 별도 구현 필요)

        // 보안 알림 이메일 전송
        emailService.sendPasswordChangeNotificationEmail(user.getEmail(), user.getName());

        log.info("Password reset completed for user: {}", user.getId());
    }

    @Transactional
    public void cleanupExpiredTokens() {
        tokenRepository.deleteExpiredOrUsedTokens(LocalDateTime.now());
        log.info("Expired tokens cleanup completed");
    }

    private String generateSecureToken() {
        SecureRandom secureRandom = new SecureRandom();
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private String hashToken(String rawToken) {
        return passwordEncoder.encode(rawToken);
    }

    private String maskEmail(String email) {
        if (email == null || email.length() < 3) {
            return "***";
        }

        int atIndex = email.indexOf('@');
        if (atIndex <= 0) {
            return "***";
        }

        String localPart = email.substring(0, atIndex);
        String domain = email.substring(atIndex);

        if (localPart.length() <= 2) {
            return localPart.charAt(0) + "*" + domain;
        } else if (localPart.length() <= 4) {
            return localPart.charAt(0) + "**" + localPart.charAt(localPart.length() - 1) + domain;
        } else {
            return localPart.substring(0, 2) + "***" + localPart.charAt(localPart.length() - 1) + domain;
        }
    }

    private boolean isUserRateLimited(Long userId) {
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long recentCount = tokenRepository.countRecentTokensForUser(userId, oneHourAgo);
        return recentCount >= RATE_LIMIT_PER_USER_HOUR;
    }

    private boolean isIpRateLimited(String ip) {
        if (ip == null) return false;
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long recentCount = tokenRepository.countRecentTokensForIp(ip, oneHourAgo);
        return recentCount >= RATE_LIMIT_PER_IP_HOUR;
    }
}