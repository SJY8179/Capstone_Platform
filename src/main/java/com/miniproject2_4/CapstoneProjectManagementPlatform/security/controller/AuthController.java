package com.miniproject2_4.CapstoneProjectManagementPlatform.security.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AuthSession;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AuthSessionRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.security.JwtUtil;
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
public class AuthController {

    private final UserRepository userRepository;
    private final AuthSessionRepository authSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository,
                          AuthSessionRepository authSessionRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.authSessionRepository = authSessionRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public record RegisterReq(String name, String email, String password) {}
    public record LoginReq(String email, String password) {}
    public record RefreshReq(String refreshToken) {}

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterReq req) {
        if (req == null || req.email() == null || req.password() == null || req.name() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "필수 값이 누락되었습니다.");
        }
        userRepository.findByEmail(req.email().trim().toLowerCase()).ifPresent(u -> {
            throw new ResponseStatusException(BAD_REQUEST, "이미 사용 중인 이메일입니다.");
        });

        UserAccount ua = UserAccount.builder()
                .name(req.name())
                .email(req.email().trim().toLowerCase())
                .role(Role.STUDENT)
                .passwordHash(passwordEncoder.encode(req.password()))
                .build();
        userRepository.save(ua);

        return ResponseEntity.ok(Map.of(
                "user", Map.of("id", ua.getId(), "name", ua.getName(), "email", ua.getEmail())
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
                "user", Map.of("id", ua.getId(), "name", ua.getName(), "email", ua.getEmail())
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
        UserAccount ua = session.getUser(); // EntityGraph 로 user 즉시로딩
        String newAccess = jwtUtil.generateAccessToken(ua.getId(), ua.getEmail(), ua.getName());
        return ResponseEntity.ok(Map.of("accessToken", newAccess));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(org.springframework.security.core.Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(UNAUTHORIZED, "인증되지 않았습니다.");
        }
        UserAccount ua = (UserAccount) auth.getPrincipal();

        // Map.of 는 null 값을 허용하지 않으므로, null-safe 로 구성
        Map<String, Object> body = new HashMap<>();
        body.put("id", ua.getId());
        body.put("name", ua.getName());
        body.put("email", ua.getEmail());
        body.put("avatarUrl", ua.getAvatarUrl() == null ? "" : ua.getAvatarUrl());

        return ResponseEntity.ok(body);
    }

    private String generateRefreshToken() {
        byte[] buf = new byte[32];
        new SecureRandom().nextBytes(buf);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }
}