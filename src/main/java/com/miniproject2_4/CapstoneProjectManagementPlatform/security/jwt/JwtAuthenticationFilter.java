package com.miniproject2_4.CapstoneProjectManagementPlatform.security.jwt;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.security.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String ctx = request.getContextPath(); // "/api"
        String path = request.getRequestURI(); // "/api/..."
        String rel  = path.startsWith(ctx) ? path.substring(ctx.length()) : path;

        // 로그인/회원가입/리프레시만 필터 패스. (/auth/me 는 토큰이 있으면 인증되도록 필터 태움)
        if (rel.equals("/auth/login") || rel.equals("/auth/register") || rel.equals("/auth/refresh")) {
            chain.doFilter(request, response);
            return;
        }

        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth != null && auth.startsWith("Bearer ")) {
            String token = auth.substring(7);
            if (jwtUtil.isValid(token)) {
                Map<String, Object> payload = jwtUtil.getPayload(token);
                try {
                    Long userId = Long.valueOf(String.valueOf(payload.get("sub")));
                    Optional<UserAccount> userOpt = userRepository.findById(userId);
                    userOpt.ifPresent(ua -> {
                        AbstractAuthenticationToken authentication =
                                new AbstractAuthenticationToken(List.of(new SimpleGrantedAuthority("ROLE_USER"))) {
                                    @Override public Object getCredentials() { return token; }
                                    @Override public Object getPrincipal() { return ua; }
                                };
                        authentication.setAuthenticated(true);
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    });
                } catch (NumberFormatException ignore) {
                    // 유효하지 않은 sub → 인증 미설정
                }
            }
        }
        chain.doFilter(request, response);
    }
}