package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.service.LocalFileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class LocalUploadController {

    private final LocalFileStorageService storage;

    @PostMapping("/uploads")
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file,
                                      Authentication auth) throws IOException {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "FILE_REQUIRED");
        }

        Long userId = extractUserId(auth);

        String original = file.getOriginalFilename();
        String key = buildKey(original);

        Path target = storage.resolveKeyToPath(key);
        Files.createDirectories(target.getParent());
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target);
        }

        String contentType = file.getContentType();
        if (contentType == null) {
            try {
                contentType = Files.probeContentType(target);
            } catch (Exception ignore) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }
        }

        Map<String, Object> resp = new HashMap<>();
        String encodedKey = URLEncoder.encode(key, StandardCharsets.UTF_8).replace("+", "%20");
        resp.put("objectUrl", "/api/files?key=" + encodedKey);
        resp.put("key", key);
        resp.put("filename", original);
        resp.put("size", file.getSize());
        resp.put("contentType", contentType);
        return resp;
    }

    private static String buildKey(String filename) {
        String safe = sanitizeFilename(filename);
        LocalDate d = LocalDate.now();
        String uuid = UUID.randomUUID().toString().replace("-", "");
        return "u/" + d.getYear() + "/" + String.format("%02d", d.getMonthValue()) + "/" +
                String.format("%02d", d.getDayOfMonth()) + "/" + uuid + "_" + safe;
    }

    private static String sanitizeFilename(String name) {
        if (name == null) name = "file";
        name = name.replace("\\", "_").replace("/", "_");
        name = name.replaceAll("\\p{Cntrl}+", "_"); // 제어문자 치환
        if (name.length() > 120) {
            int dot = name.lastIndexOf('.');
            if (dot > 0 && dot < 100) {
                String base = name.substring(0, dot);
                String ext = name.substring(dot);
                base = base.substring(0, Math.min(100, base.length()));
                name = base + ext;
            } else {
                name = name.substring(0, 120);
            }
        }
        return name;
    }

    // ASCII만 유지하는 filename 대체(확장자 유지)
    private static String asciiFallback(String name) {
        if (name == null) return "file";
        int dot = name.lastIndexOf('.');
        String base = dot >= 0 ? name.substring(0, dot) : name;
        String ext  = dot >= 0 ? name.substring(dot) : "";
        StringBuilder sb = new StringBuilder();
        for (char c : base.toCharArray()) {
            if (c <= 0x7F && c != '"' && c != '\\') {
                sb.append(c);
            } else {
                sb.append('_');
            }
        }
        // 확장자는 그대로(여기엔 보통 ASCII만 들어옴)
        return sb.toString() + ext;
    }

    private Long extractUserId(Authentication auth) {
        try {
            Object principal = auth.getPrincipal();
            var userClass = Class.forName("com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount");
            if (userClass.isInstance(principal)) {
                var idGetter = userClass.getMethod("getId");
                return (Long) idGetter.invoke(principal);
            }
        } catch (Exception ignore) {}
        return null;
    }

    /** 프리사인 토큰 기반 PUT 업로드 */
    @PutMapping("/uploads/put/{token}")
    public ResponseEntity<Void> putUpload(@PathVariable String token,
                                          HttpServletRequest request,
                                          Authentication auth) throws IOException {
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long userId = extractUserId(auth);

        try (InputStream in = request.getInputStream()) {
            storage.uploadByToken(token, userId, in);
        }
        return ResponseEntity.ok().build();
    }

    /** 다운로드/열람: /api/files?key=... */
    @GetMapping("/files")
    public ResponseEntity<?> getFile(@RequestParam("key") String key,
                                     @RequestHeader(value = "Range", required = false) String rangeHeader) throws IOException {
        Path path = storage.resolveKeyToPath(key);
        if (!Files.exists(path)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Not found");
        }

        String contentType = Files.probeContentType(path);
        if (contentType == null) contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;

        long fileLength = Files.size(path);
        String filename = path.getFileName().toString();

        boolean previewable =
                contentType.startsWith("image/") ||
                        contentType.startsWith("audio/") ||
                        contentType.startsWith("video/") ||
                        contentType.equals("application/pdf") ||
                        contentType.startsWith("text/");

        // 헤더 안전: ASCII-only filename + UTF-8 filename*
        String asciiName = asciiFallback(filename);
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        String disposition = (previewable ? "inline" : "attachment")
                + "; filename=\"" + asciiName + "\""
                + "; filename*=UTF-8''" + encoded;

        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.CONTENT_DISPOSITION, disposition);
        headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.setContentType(MediaType.parseMediaType(contentType));

        // Range 처리
        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            String[] parts = rangeHeader.substring(6).split("-", 2);
            long start = parts[0].isBlank() ? 0 : Long.parseLong(parts[0]);
            long end = (parts.length > 1 && !parts[1].isBlank()) ? Long.parseLong(parts[1]) : fileLength - 1;
            if (end >= fileLength) end = fileLength - 1;
            if (start < 0) start = 0;
            if (start > end) start = 0;

            long contentLength = end - start + 1;

            InputStream in = Files.newInputStream(path);
            long skipped = in.skip(start);
            if (skipped < start) { in.close(); in = Files.newInputStream(path); }

            headers.setContentLength(contentLength);
            headers.set(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileLength);

            return new ResponseEntity<>(new InputStreamResource(in), headers, HttpStatus.PARTIAL_CONTENT);
        }

        headers.setContentLength(fileLength);
        return new ResponseEntity<>(new InputStreamResource(Files.newInputStream(path)), headers, HttpStatus.OK);
    }
}