package com.miniproject2_4.CapstoneProjectManagementPlatform.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** 외부 라이브러리 없이 HS256 JWT 유틸 */
@Component
public class JwtUtil {
    private final String secret;
    private final ObjectMapper om = new ObjectMapper();

    public JwtUtil(@Value("${app.jwt.secret:change-this-demo-secret-please}") String secret) {
        this.secret = secret;
    }

    /** 15분짜리 access token 발급 */
    public String generateAccessToken(Long userId, String email, String name) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(15 * 60);
        Map<String,Object> claims = new HashMap<>();
        claims.put("sub", String.valueOf(userId));
        claims.put("email", email);
        claims.put("name", name);
        claims.put("iat", now.getEpochSecond());
        claims.put("exp", exp.getEpochSecond());
        return create(claims);
    }

    public boolean isValid(String token) {
        try {
            Map<String,Object> payload = parsePayload(token);
            long exp = ((Number)payload.get("exp")).longValue();
            return verify(token) && Instant.now().getEpochSecond() < exp;
        } catch (Exception e) { return false; }
    }

    public Map<String,Object> getPayload(String token) {
        try { return parsePayload(token); }
        catch (Exception e) { return Map.of(); }
    }

    // --- private helpers ---
    private String create(Map<String,Object> claims) {
        try {
            String header = b64(om.writeValueAsString(Map.of("alg","HS256","typ","JWT")));
            String body   = b64(om.writeValueAsString(claims));
            String sig    = sign(header + "." + body);
            return header + "." + body + "." + sig;
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    private Map<String,Object> parsePayload(String token) throws Exception {
        String[] p = token.split("\\.");
        if (p.length != 3) throw new IllegalArgumentException("invalid jwt");
        byte[] decoded = Base64.getUrlDecoder().decode(p[1]);
        return om.readValue(decoded, new TypeReference<Map<String,Object>>() {});
    }

    private boolean verify(String token) throws Exception {
        String[] p = token.split("\\.");
        if (p.length != 3) return false;
        String data = p[0] + "." + p[1];
        String expected = sign(data);
        return constantTimeEq(expected, p[2]);
    }

    private String sign(String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    private String b64(String s) { return Base64.getUrlEncoder().withoutPadding().encodeToString(s.getBytes(StandardCharsets.UTF_8)); }

    private boolean constantTimeEq(String a, String b) {
        if (a.length() != b.length()) return false;
        int r = 0; for (int i=0; i<a.length(); i++) r |= a.charAt(i) ^ b.charAt(i);
        return r == 0;
    }
}