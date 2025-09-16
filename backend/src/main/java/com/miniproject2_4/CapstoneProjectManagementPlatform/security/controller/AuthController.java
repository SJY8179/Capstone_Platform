package com.miniproject2_4.CapstoneProjectManagementPlatform.security.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.ProfessorReviewController;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AuthSession;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AuthSessionRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.security.JwtUtil;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final PasswordResetService passwordResetService;

    public record RegisterReq(String name, String email, String password, String role) {}
    public record LoginReq(String email, String password) {}
    public record RefreshReq(String refreshToken) {}

    private Role resolveRole(String raw) {
        if (raw == null || raw.isBlank()) return Role.STUDENT;
        try {
            return Role.valueOf(raw.trim().toUpperCase());
        } catch (Exception ignore) {
            return Role.STUDENT;
        }
    }

    // /auth/register 와 /auth/signup 모두 허용
    @PostMapping({"/register", "/signup"})
    public ResponseEntity<?> register(@RequestBody RegisterReq req) {
        if (req == null || req.email() == null || req.password() == null || req.name() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "필수 값이 누락되었습니다.");
        }
        userRepository.findByEmail(req.email().trim().toLowerCase()).ifPresent(u -> {
            throw new ResponseStatusException(BAD_REQUEST, "이미 사용 중인 이메일입니다.");
        });

        Role role = resolveRole(req.role());

        UserAccount ua = UserAccount.builder()
                .name(req.name())
                .email(req.email().trim().toLowerCase())
                .role(role)
                .passwordHash(passwordEncoder.encode(req.password()))
                .build();
        userRepository.save(ua);

        return ResponseEntity.ok(Map.of(
                "user", Map.of(
                        "id", ua.getId(),
                        "name", ua.getName(),
                        "email", ua.getEmail(),
                        "role", ua.getRole().name().toLowerCase()
                )
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginReq req) {
        UserAccount ua = userRepository.findByEmail(req.email().trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."));
        if (!passwordEncoder.matches(req.password(), ua.getPasswordHash())) {
            throw new ResponseStatusException(UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        ua.setLastLoginAt(LocalDateTime.now());
        userRepository.save(ua);

        String accessToken = jwtUtil.generateAccessToken(ua.getId(), ua.getEmail(), ua.getName());
        String refreshToken = generateRefreshToken();

        AuthSession session = AuthSession.builder()
                .user(ua)
                .refreshToken(refreshToken)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .build();
        authSessionRepository.save(session);

        return ResponseEntity.ok(Map.of(
                "accessToken", accessToken,
                "refreshToken", refreshToken,
                "user", Map.of(
                        "id", ua.getId(),
                        "name", ua.getName(),
                        "email", ua.getEmail(),
                        "role", ua.getRole().name().toLowerCase()
                )
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshReq req) {
        var session = authSessionRepository.findWithUserByRefreshToken(req.refreshToken())
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "유효하지 않은 리프레시 토큰입니다."));
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            authSessionRepository.deleteByRefreshToken(req.refreshToken());
            throw new ResponseStatusException(UNAUTHORIZED, "리프레시 토큰이 만료되었습니다.");
        }
        UserAccount ua = session.getUser();
        String newAccess = jwtUtil.generateAccessToken(ua.getId(), ua.getEmail(), ua.getName());
        return ResponseEntity.ok(Map.of("accessToken", newAccess));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(org.springframework.security.core.Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(UNAUTHORIZED, "인증되지 않았습니다.");
        }
        UserAccount ua = (UserAccount) auth.getPrincipal();

        Map<String, Object> body = new HashMap<>();
        body.put("id", ua.getId());
        body.put("name", ua.getName());
        body.put("email", ua.getEmail());
        body.put("avatarUrl", ua.getAvatarUrl() == null ? "" : ua.getAvatarUrl());
        body.put("role", ua.getRole() == null ? "student" : ua.getRole().name().toLowerCase());

        return ResponseEntity.ok(body);
    }

    @PostMapping("/forgot-id")
    public ResponseEntity<ProfessorReviewController.PasswordResetDto.SuccessResponse> forgotId(
            @Valid @RequestBody ProfessorReviewController.PasswordResetDto.ForgotIdRequest request) {

        passwordResetService.sendForgotId(request.email());

        return ResponseEntity.ok(new ProfessorReviewController.PasswordResetDto.SuccessResponse(
                "요청이 처리되었습니다. 가입된 이메일인 경우 아이디 정보가 발송됩니다."
        ));
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<ProfessorReviewController.PasswordResetDto.SuccessResponse> requestPasswordReset(
            @Valid @RequestBody ProfessorReviewController.PasswordResetDto.PasswordResetRequest request,
            HttpServletRequest httpRequest) {

        String clientIp = getClientIpAddress(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        passwordResetService.createAndSendResetToken(request.emailOrUsername(), clientIp, userAgent);

        return ResponseEntity.ok(new ProfessorReviewController.PasswordResetDto.SuccessResponse(
                "요청이 처리되었습니다. 가입된 계정인 경우 비밀번호 재설정 링크가 발송됩니다."
        ));
    }

    @GetMapping("/password-reset/validate")
    public ResponseEntity<ProfessorReviewController.PasswordResetDto.TokenValidationResponse> validateResetToken(
            @RequestParam String token) {

        boolean isValid = passwordResetService.validateToken(token);

        if (isValid) {
            return ResponseEntity.ok(new ProfessorReviewController.PasswordResetDto.TokenValidationResponse(
                    true, "유효한 토큰입니다."
            ));
        } else {
            return ResponseEntity.badRequest().body(new ProfessorReviewController.PasswordResetDto.TokenValidationResponse(
                    false, "유효하지 않거나 만료된 토큰입니다."
            ));
        }
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> confirmPasswordReset(
            @Valid @RequestBody ProfessorReviewController.PasswordResetDto.PasswordResetConfirm request) {

        try {
            passwordResetService.confirmPasswordReset(request.token(), request.newPassword());
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(BAD_REQUEST, e.getMessage());
        }
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String[] headers = {
                "X-Forwarded-For",
                "X-Real-IP",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_X_FORWARDED_FOR",
                "HTTP_X_FORWARDED",
                "HTTP_X_CLUSTER_CLIENT_IP",
                "HTTP_CLIENT_IP",
                "HTTP_FORWARDED_FOR",
                "HTTP_FORWARDED",
                "HTTP_VIA",
                "REMOTE_ADDR"
        };

        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // X-Forwarded-For can contain multiple IPs, get the first one
                if (ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                return ip;
            }
        }

        return request.getRemoteAddr();
    }

    private String generateRefreshToken() {
        byte[] buf = new byte[32];
        new SecureRandom().nextBytes(buf);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }
}
