package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Log4j2
public class LocalFileStorageService implements StorageService {

    @Value("${app.upload.root-dir:./uploads}")
    private String rootDirStr;

    @Value("${app.upload.ttl-seconds:600}")
    private int ttlSeconds;

    // 서버 컨텍스트 경로 (기본 /api)
    @Value("${server.servlet.context-path:/api}")
    private String contextPath;

    private Path rootDir;

    private static class Ticket {
        final Path path;
        final String contentType;
        final long size;
        final long expiresAtEpochSec;
        final Long userId;
        final Long projectId;

        Ticket(Path path, String contentType, long size, long expiresAtEpochSec, Long userId, Long projectId) {
            this.path = path;
            this.contentType = contentType;
            this.size = size;
            this.expiresAtEpochSec = expiresAtEpochSec;
            this.userId = userId;
            this.projectId = projectId;
        }

        boolean isExpired() {
            return Instant.now().getEpochSecond() > expiresAtEpochSec;
        }
    }

    /** token -> ticket */
    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();

    @PostConstruct
    void init() throws IOException {
        this.rootDir = Paths.get(rootDirStr).toAbsolutePath().normalize();
        Files.createDirectories(this.rootDir);
        log.info("Local uploads root: {}", this.rootDir);
    }

    @Override
    public PresignedUpload initPresignedUpload(Long projectId, UserAccount user, String filename, String contentType, long size) {
        String safeName = sanitizeFilename(filename);
        LocalDate today = LocalDate.now();

        String key = String.format(
                "project-%d/u%s/%04d/%02d/%02d/%d_%s",
                projectId,
                user != null && user.getId() != null ? user.getId() : 0L,
                today.getYear(), today.getMonthValue(), today.getDayOfMonth(),
                System.currentTimeMillis(),
                safeName
        );
        Path filePath = resolveKeyToPath(key);

        // PUT 업로드 토큰 발급
        String token = UUID.randomUUID().toString().replace("-", "");
        long expiresAt = Instant.now().getEpochSecond() + Math.max(1, ttlSeconds);

        tickets.put(token, new Ticket(filePath, emptyTo(contentType, "application/octet-stream"), size, expiresAt,
                user != null ? user.getId() : null, projectId));

        String uploadUrl = joinPath(contextPath, "/uploads/put/", token);
        String objectUrl = joinPath(contextPath, "/files?key=", urlEncode(key));

        return new PresignedUpload(
                uploadUrl,
                Map.of("Content-Type", emptyTo(contentType, "application/octet-stream")),
                objectUrl,
                Math.max(1, ttlSeconds),
                key
        );
    }

    /**
     * PUT 업로드 처리: 토큰을 검증하고 스트림을 파일로 저장한다.
     */
    public void uploadByToken(String token, Long userId, InputStream in) throws IOException {
        Ticket t = tickets.remove(token);
        if (t == null) throw new IllegalArgumentException("invalid token");
        if (t.isExpired()) throw new IllegalArgumentException("expired token");

        // 옵션: 토큰 발급자와 동일 사용자만 업로드 허용
        if (t.userId != null && userId != null && !t.userId.equals(userId)) {
            throw new SecurityException("uploader mismatch");
        }

        Path p = t.path;
        Files.createDirectories(p.getParent());

        // 임시 파일에 쓰고 원자적 이동
        Path tmp = Files.createTempFile(p.getParent(), "upload-", ".part");
        try (in) {
            Files.copy(in, tmp, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            FileSystemUtils.deleteRecursively(tmp);
            throw e;
        }

        Files.move(tmp, p, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }

    /**
     * 다운로드용 경로 해석 (루트 외부 접근 방지)
     */
    public Path resolveKeyToPath(String key) {
        String normalized = key.replace("\\", "/");
        while (normalized.startsWith("/")) normalized = normalized.substring(1);
        Path p = this.rootDir.resolve(normalized).normalize();
        if (!p.startsWith(this.rootDir)) {
            throw new SecurityException("invalid key");
        }
        return p;
    }

    private static String sanitizeFilename(String raw) {
        if (raw == null) return "file";
        String name = raw.trim()
                .replace("\\", "/");
        name = name.substring(name.lastIndexOf('/') + 1);
        name = name.replaceAll("\\s+", "_")
                .replaceAll("[\\p{Cntrl}]+", "");
        if (name.isEmpty()) name = "file";
        return name;
    }

    private static String emptyTo(String v, String def) {
        return (v == null || v.isBlank()) ? def : v;
    }

    private static String urlEncode(String v) {
        return URLEncoder.encode(v, StandardCharsets.UTF_8);
    }

    private static String joinPath(String a, String b, String c) {
        return rtrim(a) + b + c;
    }

    private static String rtrim(String s) {
        if (s == null) return "";
        while (s.endsWith("/")) s = s.substring(0, s.length() - 1);
        return s;
    }
}