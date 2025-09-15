package com.miniproject2_4.CapstoneProjectManagementPlatform.security.jwt;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.UserRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.security.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.*;

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
        String ctx = request.getContextPath(); // e.g. "/api"
        String path = request.getRequestURI(); // e.g. "/api/..."
        String rel  = path.startsWith(ctx) ? path.substring(ctx.length()) : path;

        // 로그인/회원가입/리프레시/프리플라이트는 필터 패스
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())
                || rel.equals("/auth/login")
                || rel.equals("/auth/register")
                || rel.equals("/auth/signup")
                || rel.equals("/auth/refresh")) {
            chain.doFilter(request, response);
            return;
        }

        // 토큰 추출 (Bearer 우선, 없으면 쿠키)
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        String bearerToken = (header != null && header.startsWith("Bearer ")) ? header.substring(7) : null;

        String cookieToken = null;
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if ("ACCESS_TOKEN".equals(c.getName())) {
                    cookieToken = c.getValue();
                    break;
                }
            }
        }
        final String token = (bearerToken != null) ? bearerToken : cookieToken;

        if (token != null && jwtUtil.isValid(token)) {
            final Map<String, Object> payload = jwtUtil.getPayload(token);
            try {
                final Long userId = Long.valueOf(String.valueOf(payload.get("sub")));
                userRepository.findById(userId).ifPresent(ua -> {
                    List<GrantedAuthority> authorities = buildAuthorities(ua, payload);

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(ua, null, authorities);
                    authentication.setDetails(token);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                });
            } catch (NumberFormatException ignore) {
                // 유효하지 않은 sub → 인증 미설정
            }
        }

        chain.doFilter(request, response);
    }

    /**
     * 권한 구성:
     *  1) 기본 ROLE_USER
     *  2) JWT payload 의 roles/role 클레임
     *  3) (없으면) DB UserAccount의 역할을 reflection으로 가져와 ROLE_ 접두어로 추가
     */
    private List<GrantedAuthority> buildAuthorities(UserAccount ua, Map<String, Object> payload) {
        List<GrantedAuthority> list = new ArrayList<>();
        list.add(new SimpleGrantedAuthority("ROLE_USER"));

        // 2) JWT roles/role
        Object rolesClaim = Optional.ofNullable(payload.get("roles")).orElse(payload.get("role"));
        if (rolesClaim instanceof Collection<?> coll) {
            for (Object r : coll) {
                if (r != null) list.add(new SimpleGrantedAuthority("ROLE_" + r.toString().toUpperCase()));
            }
        } else if (rolesClaim instanceof String s && !s.isBlank()) {
            list.add(new SimpleGrantedAuthority("ROLE_" + s.toUpperCase()));
        }

        // 3) DB 기반 (토큰에 없을 때)
        if (list.size() == 1) { // 아직 ROLE_USER만 있는 경우
            // 흔한 메서드 이름 후보들 시도
            String[] candidates = new String[]{
                    "getRole", "getUserRole", "getType", "getUserType", "getAuthority"
            };
            for (String mName : candidates) {
                try {
                    Method m = ua.getClass().getMethod(mName);
                    Object v = m.invoke(ua);
                    if (v != null) {
                        String s = v.toString().trim();
                        if (!s.isEmpty()) {
                            list.add(new SimpleGrantedAuthority("ROLE_" + s.toUpperCase()));
                            break;
                        }
                    }
                } catch (ReflectiveOperationException ignored) {}
            }
            // boolean 플래그형도 보정
            try {
                Method m = ua.getClass().getMethod("isAdmin");
                Object v = m.invoke(ua);
                if (v instanceof Boolean b && b) list.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            } catch (ReflectiveOperationException ignored) {}
            try {
                Method m = ua.getClass().getMethod("isProfessor");
                Object v = m.invoke(ua);
                if (v instanceof Boolean b && b) list.add(new SimpleGrantedAuthority("ROLE_PROFESSOR"));
            } catch (ReflectiveOperationException ignored) {}
        }
        return list;
    }
}