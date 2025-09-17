package com.miniproject2_4.CapstoneProjectManagementPlatform.security.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.ProfessorReviewController;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.PasswordResetService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PasswordResetService passwordResetService;

    // Mock other dependencies from AuthController
    @MockBean
    private com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository userRepository;

    @MockBean
    private com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AuthSessionRepository authSessionRepository;

    @MockBean
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @MockBean
    private com.miniproject2_4.CapstoneProjectManagementPlatform.security.JwtUtil jwtUtil;

    @Test
    void forgotId_ShouldReturnSuccessResponse() throws Exception {
        // Given
        ProfessorReviewController.PasswordResetDto.ForgotIdRequest request = new ProfessorReviewController.PasswordResetDto.ForgotIdRequest("test@example.com");

        // When & Then
        mockMvc.perform(post("/auth/forgot-id")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("요청이 처리되었습니다. 가입된 이메일인 경우 아이디 정보가 발송됩니다."));

        verify(passwordResetService).sendForgotId("test@example.com");
    }

    @Test
    void forgotId_WithInvalidEmail_ShouldReturnBadRequest() throws Exception {
        // Given
        ProfessorReviewController.PasswordResetDto.ForgotIdRequest request = new ProfessorReviewController.PasswordResetDto.ForgotIdRequest("invalid-email");

        // When & Then
        mockMvc.perform(post("/auth/forgot-id")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(passwordResetService, never()).sendForgotId(anyString());
    }

    @Test
    void requestPasswordReset_ShouldReturnSuccessResponse() throws Exception {
        // Given
        ProfessorReviewController.PasswordResetDto.PasswordResetRequest request = new ProfessorReviewController.PasswordResetDto.PasswordResetRequest("test@example.com");

        // When & Then
        mockMvc.perform(post("/auth/password-reset/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("요청이 처리되었습니다. 가입된 계정인 경우 비밀번호 재설정 링크가 발송됩니다."));

        verify(passwordResetService).createAndSendResetToken(eq("test@example.com"), anyString(), anyString());
    }

    @Test
    void validateResetToken_WithValidToken_ShouldReturnValid() throws Exception {
        // Given
        when(passwordResetService.validateToken("validToken")).thenReturn(true);

        // When & Then
        mockMvc.perform(get("/auth/password-reset/validate")
                .param("token", "validToken"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.message").value("유효한 토큰입니다."));
    }

    @Test
    void validateResetToken_WithInvalidToken_ShouldReturnInvalid() throws Exception {
        // Given
        when(passwordResetService.validateToken("invalidToken")).thenReturn(false);

        // When & Then
        mockMvc.perform(get("/auth/password-reset/validate")
                .param("token", "invalidToken"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.valid").value(false))
                .andExpect(jsonPath("$.message").value("유효하지 않거나 만료된 토큰입니다."));
    }

    @Test
    void confirmPasswordReset_WithValidData_ShouldReturnNoContent() throws Exception {
        // Given
        ProfessorReviewController.PasswordResetDto.PasswordResetConfirm request = new ProfessorReviewController.PasswordResetDto.PasswordResetConfirm("validToken", "newPassword123");

        // When & Then
        mockMvc.perform(post("/auth/password-reset/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        verify(passwordResetService).confirmPasswordReset("validToken", "newPassword123");
    }

    @Test
    void confirmPasswordReset_WithInvalidToken_ShouldReturnBadRequest() throws Exception {
        // Given
        ProfessorReviewController.PasswordResetDto.PasswordResetConfirm request = new ProfessorReviewController.PasswordResetDto.PasswordResetConfirm("invalidToken", "newPassword123");
        doThrow(new IllegalArgumentException("유효하지 않은 토큰입니다."))
                .when(passwordResetService).confirmPasswordReset("invalidToken", "newPassword123");

        // When & Then
        mockMvc.perform(post("/auth/password-reset/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void confirmPasswordReset_WithShortPassword_ShouldReturnBadRequest() throws Exception {
        // Given
        ProfessorReviewController.PasswordResetDto.PasswordResetConfirm request = new ProfessorReviewController.PasswordResetDto.PasswordResetConfirm("validToken", "123");

        // When & Then
        mockMvc.perform(post("/auth/password-reset/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(passwordResetService, never()).confirmPasswordReset(anyString(), anyString());
    }
}