package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectDocumentDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProjectDocument;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.TeamMemberRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ProjectDocumentService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ProjectDocumentController {

    private final ProjectDocumentService service;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;

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

    private boolean canViewProject(Long projectId, Authentication auth) {
        // 교수/관리자는 멤버가 아니어도 열람 가능
        if (hasRole(auth, "PROFESSOR") || hasRole(auth, "ADMIN")) return true;
        UserAccount ua = ensureUser(auth);
        return isProjectMember(projectId, ua.getId());
    }

    private ProjectDocumentDto map(ProjectDocument d) {
        var by = d.getCreatedBy() == null ? null : new ProjectDocumentDto.SimpleUser(d.getCreatedBy().getId(), d.getCreatedBy().getName());
        return new ProjectDocumentDto(
                d.getId(),
                d.getProject().getId(),
                d.getTitle(),
                d.getUrl(),
                d.getType().name(),
                d.getCreatedAt() == null ? null : d.getCreatedAt().format(ISO),
                by
        );
    }

    /** 목록 조회: 프로젝트 멤버 or (교수/관리자) */
    @GetMapping("/projects/{projectId}/documents")
    public List<ProjectDocumentDto> list(@PathVariable Long projectId, Authentication auth) {
        ensureUser(auth);
        if (!canViewProject(projectId, auth)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");
        }
        return service.list(projectId).stream().map(this::map).toList();
    }

    public record CreateDocReq(String title, String url, String type) {}

    /** 생성: 프로젝트 멤버만 */
    @PostMapping("/projects/{projectId}/documents")
    public ProjectDocumentDto create(@PathVariable Long projectId, @RequestBody CreateDocReq req, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        if (!isProjectMember(projectId, ua.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");
        }
        ProjectDocument.Type t;
        try { t = ProjectDocument.Type.valueOf(req.type() == null ? "OTHER" : req.type().toUpperCase()); }
        catch (Exception ignore) { t = ProjectDocument.Type.OTHER; }
        return map(service.create(projectId, req.title(), req.url(), t, ua));
    }

    /** 삭제: 프로젝트 멤버만 (docId → projectId 역참조) */
    @DeleteMapping("/documents/{docId}")
    public void delete(@PathVariable Long docId, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        ProjectDocument doc = em.find(ProjectDocument.class, docId);
        if (doc != null) {
            Long projectId = doc.getProject() != null ? doc.getProject().getId() : null;
            if (projectId == null || !isProjectMember(projectId, ua.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");
            }
        }
        service.delete(docId);
    }

    /* =========================================================
     * 권한 조회: 프론트에서 버튼 가시성/동작 제어용
     * ========================================================= */
    public record ProjectPermissions(
            boolean isMember,
            boolean isProfessor,
            boolean isAdmin,
            boolean canView,
            boolean canCreateDoc,
            boolean canDeleteDoc,
            boolean canRequestReview,          // 학생(팀 멤버)만
            boolean canModerateAssignments     // 교수/관리자
    ) {}

    @GetMapping("/projects/{projectId}/me/permissions")
    public ProjectPermissions myPermissions(@PathVariable Long projectId, Authentication auth) {
        UserAccount ua = ensureUser(auth);

        boolean isProfessor = hasRole(auth, "PROFESSOR");
        boolean isAdmin = hasRole(auth, "ADMIN");
        boolean isMember = isProjectMember(projectId, ua.getId());

        boolean canView = isMember || isProfessor || isAdmin;
        boolean canCreateDoc = isMember; // 문서 생성/삭제는 팀 멤버만
        boolean canDeleteDoc = isMember;

        // 검토요청은 학생(팀 멤버)에게만 보이게
        boolean canRequestReview = isMember && !(isProfessor || isAdmin);

        // 검토 승인/반려 등 상태 변경은 교수/관리자에게
        boolean canModerateAssignments = isProfessor || isAdmin;

        return new ProjectPermissions(
                isMember, isProfessor, isAdmin,
                canView, canCreateDoc, canDeleteDoc,
                canRequestReview, canModerateAssignments
        );
    }
}
