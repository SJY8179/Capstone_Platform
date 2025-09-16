package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class PasswordResetDto {

    public record ForgotIdRequest(
            @NotBlank(message = "이메일은 필수입니다")
            @Email(message = "올바른 이메일 형식이 아닙니다")
            String email
    ) {}

    public record PasswordResetRequest(
            @NotBlank(message = "이메일 또는 사용자명은 필수입니다")
            String emailOrUsername
    ) {}

    public record PasswordResetConfirm(
            @NotBlank(message = "토큰은 필수입니다")
            String token,

            @NotBlank(message = "새 비밀번호는 필수입니다")
            @Size(min = 6, message = "비밀번호는 최소 6자 이상이어야 합니다")
            String newPassword
    ) {}

    public record SuccessResponse(
            String message
    ) {}

    public record TokenValidationResponse(
            boolean valid,
            String message
    ) {}
}