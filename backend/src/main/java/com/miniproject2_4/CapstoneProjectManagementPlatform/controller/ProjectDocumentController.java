package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectDocumentDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProjectDocument;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.TeamMemberRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ProjectDocumentService;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.StorageService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ProjectDocumentController {

    private final ProjectDocumentService service;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final StorageService storageService;

    @PersistenceContext
    private EntityManager em;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private UserAccount ensureUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserAccount)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        return (UserAccount) auth.getPrincipal();
    }

    private boolean hasRole(Authentication auth, String role) {
        if (auth == null) return false;
        final String target = "ROLE_" + role.toUpperCase();
        return auth.getAuthorities().stream().anyMatch(a -> target.equals(a.getAuthority()));
    }

    private boolean isProjectMember(Long projectId, Long userId) {
        var p = projectRepository.findById(projectId).orElse(null);
        if (p == null || p.getTeam() == null) return false;
        return teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), userId);
    }

    private boolean isAssignedProfessor(Long projectId, Long userId) {
        var p = projectRepository.findById(projectId).orElse(null);
        if (p == null || p.getProfessor() == null) return false;
        return p.getProfessor().getId().equals(userId);
    }

    /** 파일 편집 권한: 팀 멤버 OR (담당 교수) OR 관리자 */
    private boolean canEditFiles(Long projectId, Authentication auth) {
        if (hasRole(auth, "ADMIN")) return true;
        UserAccount ua = ensureUser(auth);
        if (hasRole(auth, "PROFESSOR") && isAssignedProfessor(projectId, ua.getId())) return true;
        return isProjectMember(projectId, ua.getId());
    }

    /** 보기 권한: 팀 멤버 OR (담당 교수) OR 관리자 */
    private boolean canViewProject(Long projectId, Authentication auth) {
        if (hasRole(auth, "ADMIN")) return true;
        UserAccount ua = ensureUser(auth);
        if (hasRole(auth, "PROFESSOR") && isAssignedProfessor(projectId, ua.getId())) return true;
        return isProjectMember(projectId, ua.getId());
    }

    private ProjectDocumentDto map(ProjectDocument d) {
        ProjectDocumentDto.SimpleUser byDto = null;
        UserAccount by = d.getCreatedBy();
        if (by != null) {
            Long id = by.getId();
            String name = Hibernate.isInitialized(by) ? by.getName() : null;
            byDto = new ProjectDocumentDto.SimpleUser(id, name);
        }
        return new ProjectDocumentDto(
                d.getId(),
                d.getProject().getId(),
                d.getTitle(),
                d.getUrl(),
                d.getType().name(),
                d.getCreatedAt() == null ? null : d.getCreatedAt().format(ISO),
                byDto
        );
    }

    /** 목록 조회 */
    @Transactional(readOnly = true)
    @GetMapping("/projects/{projectId}/documents")
    public List<ProjectDocumentDto> list(@PathVariable Long projectId, Authentication auth) {
        ensureUser(auth);
        if (!canViewProject(projectId, auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");
        }
        return service.list(projectId).stream().map(this::map).toList();
    }

    public record CreateDocReq(String title, String url, String type) {}

    /** URL 정규화: 내부 경로(/api/...)는 그대로, 스킴 없는 외부 링크는 https:// 부여 */
    private String normalizeUrl(String url) {
        if (url == null) return null;
        String u = url.trim();
        if (u.isEmpty()) return u;
        if (u.startsWith("/")) return u; // 내부 경로 유지
        if (u.matches("^[a-zA-Z][a-zA-Z0-9+\\.-]*:.*")) return u; // 스킴 존재
        if (u.startsWith("//")) return "https:" + u;
        return "https://" + u;
    }

    /** 서버 유효성 검사: 내부 경로 허용, 그 외 http/https + host 필수 */
    private boolean isValidUrlAfterNormalize(String u) {
        if (u == null || u.isBlank()) return false;
        if (u.startsWith("/")) return true; // 내부 경로
        try {
            URI uri = URI.create(u);
            String scheme = uri.getScheme();
            if (scheme == null) return false;
            if (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https")) return false;
            if (uri.getHost() == null || uri.getHost().isBlank()) return false;
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** 생성: 팀 멤버 OR (담당 교수) OR 관리자 */
    @PostMapping("/projects/{projectId}/documents")
    public ProjectDocumentDto create(@PathVariable Long projectId, @RequestBody CreateDocReq req, Authentication auth) {
        ensureUser(auth);
        if (!canEditFiles(projectId, auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NO_EDIT_PERMISSION");
        }
        ProjectDocument.Type t;
        try { t = ProjectDocument.Type.valueOf(req.type() == null ? "OTHER" : req.type().toUpperCase()); }
        catch (Exception ignore) { t = ProjectDocument.Type.OTHER; }

        String normalized = normalizeUrl(req.url());
        if (!isValidUrlAfterNormalize(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "INVALID_URL: http(s)://example.com 형태의 외부 링크 또는 /api/... 내부 경로만 허용됩니다.");
        }

        UserAccount ua = (UserAccount) auth.getPrincipal();
        return map(service.create(projectId, req.title(), normalized, t, ua));
    }

    /** 삭제: 팀 멤버 OR (담당 교수) OR 관리자 */
    @DeleteMapping("/documents/{docId}")
    public void delete(@PathVariable Long docId, Authentication auth) {
        ensureUser(auth);
        ProjectDocument doc = em.find(ProjectDocument.class, docId);
        if (doc != null) {
            Long projectId = (doc.getProject() != null ? doc.getProject().getId() : null);
            if (projectId == null || !canEditFiles(projectId, auth)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NO_EDIT_PERMISSION");
            }
        }
        service.delete(docId);
    }

    /* ===============================
     * 프리사인 업로드 초기화
     * =============================== */
    public record InitUploadReq(String filename, String contentType, Long size) {}
    public record PresignResp(String uploadUrl, Map<String, String> headers, String objectUrl, int expiresIn, String key) {}

    /** 업로드 URL 발급: 팀 멤버 OR (담당 교수) OR 관리자 */
    @PostMapping("/projects/{projectId}/documents/upload-init")
    public PresignResp initUpload(@PathVariable Long projectId, @RequestBody InitUploadReq req, Authentication auth) {
        ensureUser(auth);
        if (!canEditFiles(projectId, auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NO_EDIT_PERMISSION");
        }
        if (req == null || req.filename() == null || req.filename().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "filename is required");
        }

        var ps = storageService.initPresignedUpload(
                projectId,
                (UserAccount) auth.getPrincipal(),
                req.filename(),
                req.contentType() == null ? "application/octet-stream" : req.contentType(),
                req.size() == null ? 0L : req.size()
        );
        return new PresignResp(ps.uploadUrl(), ps.headers(), ps.objectUrl(), ps.expiresIn(), ps.key());
    }

    /* =========================================================
     * 권한 조회: 프론트 버튼 가시성/동작 제어용
     * ========================================================= */
    public record ProjectPermissions(
            boolean isMember,
            boolean isProfessor,
            boolean isAdmin,
            boolean canView,
            boolean canCreateDoc,
            boolean canDeleteDoc,
            boolean canRequestReview,
            boolean canModerateAssignments
    ) {}

    @GetMapping("/projects/{projectId}/me/permissions")
    public ProjectPermissions myPermissions(@PathVariable Long projectId, Authentication auth) {
        UserAccount ua = ensureUser(auth);

        boolean isProfessor = hasRole(auth, "PROFESSOR");
        boolean isAdmin = hasRole(auth, "ADMIN");
        boolean isMember = isProjectMember(projectId, ua.getId());
        boolean isProfessorOfProject = isProfessor && isAssignedProfessor(projectId, ua.getId());

        boolean canView = isMember || isProfessorOfProject || isAdmin;

        // 파일 편집: 팀 멤버 OR (담당 교수) OR 관리자
        boolean canCreateDoc = isMember || isProfessorOfProject || isAdmin;
        boolean canDeleteDoc = isMember || isProfessorOfProject || isAdmin;

        // 검토요청은 학생(팀 멤버)에게만
        boolean canRequestReview = isMember && !(isProfessor || isAdmin);

        // 검토 승인/반려는 교수/관리자
        boolean canModerateAssignments = isProfessor || isAdmin;

        return new ProjectPermissions(
                isMember, isProfessor, isAdmin,
                canView, canCreateDoc, canDeleteDoc,
                canRequestReview, canModerateAssignments
        );
    }
}