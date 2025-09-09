package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email already exists");
        }
        UserAccount u = UserAccount.builder()
                .name(req.name())
                .email(req.email())
                .role(Role.STUDENT) // 기본값
                .passwordHash(passwordEncoder.encode(req.password()))
                .build();
        userRepository.save(u);
        return new AuthResponse(u.getId(), u.getName(), u.getEmail(), u.getRole().name());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req,
                              HttpServletRequest request,
                              HttpServletResponse response) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.email(), req.password())
        );

        // ★ 인증 컨텍스트를 세션에 저장(핵심)
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        request.getSession(true); // 세션 생성 보장
        new HttpSessionSecurityContextRepository().saveContext(context, request, response);

        UserAccount u = userRepository.findByEmail(req.email()).orElseThrow();
        return new AuthResponse(u.getId(), u.getName(), u.getEmail(), u.getRole().name());
    }

    @GetMapping("/me")
    public AuthResponse me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        var email = authentication.getName();
        var u = userRepository.findByEmail(email).orElseThrow();
        return new AuthResponse(u.getId(), u.getName(), u.getEmail(), u.getRole().name());
    }

    @PostMapping("/logout")
    public void logout(HttpSession session) { session.invalidate(); }
}