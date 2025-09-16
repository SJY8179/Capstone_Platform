package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.PasswordResetToken;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.PasswordResetTokenRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PasswordResetService passwordResetService;

    private UserAccount testUser;

    @BeforeEach
    void setUp() {
        testUser = UserAccount.builder()
                .id(1L)
                .name("Test User")
                .email("test@example.com")
                .role(Role.STUDENT)
                .passwordHash("hashedPassword")
                .build();
    }

    @Test
    void sendForgotId_WhenUserExists_ShouldSendEmail() {
        // Given
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

        // When
        passwordResetService.sendForgotId("test@example.com");

        // Then
        verify(emailService).sendForgotIdEmail(eq("test@example.com"), anyString());
    }

    @Test
    void sendForgotId_WhenUserNotExists_ShouldNotSendEmail() {
        // Given
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());

        // When
        passwordResetService.sendForgotId("nonexistent@example.com");

        // Then
        verify(emailService, never()).sendForgotIdEmail(anyString(), anyString());
    }

    @Test
    void createAndSendResetToken_WhenUserExists_ShouldCreateTokenAndSendEmail() {
        // Given
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(tokenRepository.countRecentTokensForUser(any(), any())).thenReturn(0L);
        when(tokenRepository.countRecentTokensForIp(any(), any())).thenReturn(0L);
        when(passwordEncoder.encode(anyString())).thenReturn("hashedToken");

        // When
        passwordResetService.createAndSendResetToken("test@example.com", "127.0.0.1", "TestUserAgent");

        // Then
        verify(tokenRepository).invalidateAllTokensForUser(1L);
        verify(tokenRepository).save(any(PasswordResetToken.class));
        verify(emailService).sendPasswordResetEmail(eq("test@example.com"), anyString());
    }

    @Test
    void createAndSendResetToken_WhenUserNotExists_ShouldNotCreateToken() {
        // Given
        when(userRepository.findByEmail("nonexistent@example.com")).thenReturn(Optional.empty());
        when(tokenRepository.countRecentTokensForIp(any(), any())).thenReturn(0L);

        // When
        passwordResetService.createAndSendResetToken("nonexistent@example.com", "127.0.0.1", "TestUserAgent");

        // Then
        verify(tokenRepository, never()).save(any(PasswordResetToken.class));
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
    }

    @Test
    void createAndSendResetToken_WhenRateLimited_ShouldNotCreateToken() {
        // Given
        when(tokenRepository.countRecentTokensForIp(any(), any())).thenReturn(10L); // Rate limit exceeded

        // When
        passwordResetService.createAndSendResetToken("test@example.com", "127.0.0.1", "TestUserAgent");

        // Then
        verify(tokenRepository, never()).save(any(PasswordResetToken.class));
        verify(emailService, never()).sendPasswordResetEmail(anyString(), anyString());
    }

    @Test
    void validateToken_WhenValidToken_ShouldReturnTrue() {
        // Given
        PasswordResetToken validToken = PasswordResetToken.builder()
                .tokenHash("hashedToken")
                .expiresAt(LocalDateTime.now().plusHours(1))
                .used(false)
                .attempts(0)
                .build();

        when(passwordEncoder.encode("rawToken")).thenReturn("hashedToken");
        when(tokenRepository.findByTokenHash("hashedToken")).thenReturn(Optional.of(validToken));

        // When
        boolean result = passwordResetService.validateToken("rawToken");

        // Then
        assertTrue(result);
    }

    @Test
    void validateToken_WhenExpiredToken_ShouldReturnFalse() {
        // Given
        PasswordResetToken expiredToken = PasswordResetToken.builder()
                .tokenHash("hashedToken")
                .expiresAt(LocalDateTime.now().minusHours(1)) // Expired
                .used(false)
                .attempts(0)
                .build();

        when(passwordEncoder.encode("rawToken")).thenReturn("hashedToken");
        when(tokenRepository.findByTokenHash("hashedToken")).thenReturn(Optional.of(expiredToken));

        // When
        boolean result = passwordResetService.validateToken("rawToken");

        // Then
        assertFalse(result);
    }

    @Test
    void validateToken_WhenUsedToken_ShouldReturnFalse() {
        // Given
        PasswordResetToken usedToken = PasswordResetToken.builder()
                .tokenHash("hashedToken")
                .expiresAt(LocalDateTime.now().plusHours(1))
                .used(true) // Already used
                .attempts(0)
                .build();

        when(passwordEncoder.encode("rawToken")).thenReturn("hashedToken");
        when(tokenRepository.findByTokenHash("hashedToken")).thenReturn(Optional.of(usedToken));

        // When
        boolean result = passwordResetService.validateToken("rawToken");

        // Then
        assertFalse(result);
    }

    @Test
    void confirmPasswordReset_WhenValidToken_ShouldUpdatePasswordAndInvalidateTokens() {
        // Given
        PasswordResetToken validToken = PasswordResetToken.builder()
                .userId(1L)
                .tokenHash("hashedToken")
                .expiresAt(LocalDateTime.now().plusHours(1))
                .used(false)
                .attempts(0)
                .build();

        when(passwordEncoder.encode("rawToken")).thenReturn("hashedToken");
        when(passwordEncoder.encode("newPassword")).thenReturn("hashedNewPassword");
        when(tokenRepository.findByTokenHash("hashedToken")).thenReturn(Optional.of(validToken));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // When
        passwordResetService.confirmPasswordReset("rawToken", "newPassword");

        // Then
        assertEquals("hashedNewPassword", testUser.getPasswordHash());
        assertTrue(validToken.isUsed());
        verify(userRepository).save(testUser);
        verify(tokenRepository).save(validToken);
        verify(tokenRepository).invalidateAllTokensForUser(1L);
        verify(emailService).sendPasswordChangeNotificationEmail("test@example.com", "Test User");
    }

    @Test
    void confirmPasswordReset_WhenInvalidToken_ShouldThrowException() {
        // Given
        when(passwordEncoder.encode("rawToken")).thenReturn("hashedToken");
        when(tokenRepository.findByTokenHash("hashedToken")).thenReturn(Optional.empty());

        // When & Then
        assertThrows(IllegalArgumentException.class, () -> {
            passwordResetService.confirmPasswordReset("rawToken", "newPassword");
        });
    }

    @Test
    void confirmPasswordReset_WhenExpiredToken_ShouldThrowException() {
        // Given
        PasswordResetToken expiredToken = PasswordResetToken.builder()
                .tokenHash("hashedToken")
                .expiresAt(LocalDateTime.now().minusHours(1)) // Expired
                .used(false)
                .attempts(0)
                .build();

        when(passwordEncoder.encode("rawToken")).thenReturn("hashedToken");
        when(tokenRepository.findByTokenHash("hashedToken")).thenReturn(Optional.of(expiredToken));

        // When & Then
        assertThrows(IllegalArgumentException.class, () -> {
            passwordResetService.confirmPasswordReset("rawToken", "newPassword");
        });
    }
}