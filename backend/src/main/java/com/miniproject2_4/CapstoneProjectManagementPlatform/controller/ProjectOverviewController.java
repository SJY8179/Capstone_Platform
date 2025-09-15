package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectOverviewDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.TeamMemberRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ProjectOverviewService;
import lombok.RequiredArgsConstructor;
import org.hibernate.LazyInitializationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.function.Supplier;

@RestController
@RequiredArgsConstructor
public class ProjectOverviewController {

    private final ProjectOverviewService service;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private UserAccount ensureUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserAccount)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        return (UserAccount) auth.getPrincipal();
    }

    // ✅ 요구사항: 교수/관리자만 게시/승인/반려 가능 (TA 제외)
    private boolean canPublish(UserAccount ua) {
        return ua.getRole() == Role.PROFESSOR || ua.getRole() == Role.ADMIN;
    }

    private boolean isProjectMember(Long projectId, Long userId) {
        var p = projectRepository.findById(projectId).orElse(null);
        if (p == null || p.getTeam() == null) return false;
        return teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), userId);
    }

    private static <T> T safeGet(Supplier<T> s) {
        try { return s.get(); } catch (LazyInitializationException e) { return null; }
    }

    private ProjectOverviewDto.SimpleUser toSimple(UserAccount u) {
        if (u == null) return null;
        Long id = safeGet(u::getId);
        String name = safeGet(u::getName);
        return new ProjectOverviewDto.SimpleUser(id, name);
    }

    private ProjectOverviewDto map(com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProjectOverview ov) {
        var upd = toSimple(ov.getUpdatedBy());
        var pa  = toSimple(ov.getPendingAuthor());
        // 상태 널 방지(PUBLISHED 기본)
        String status = ov.getStatus() == null ? "PUBLISHED" : ov.getStatus().name();

        return new ProjectOverviewDto(
                ov.getMarkdown(),
                status,
                ov.getVersion(),
                ov.getUpdatedAt() == null ? null : ov.getUpdatedAt().format(ISO),
                upd,
                ov.getPendingMarkdown(),
                pa,
                ov.getPendingAt() == null ? null : ov.getPendingAt().format(ISO)
        );
    }

    @GetMapping("/projects/{projectId}/overview")
    @Transactional(readOnly = true)
    public ProjectOverviewDto get(@PathVariable Long projectId) {
        return map(service.getOrInit(projectId));
    }

    public record OverviewBody(String markdown) {}

    /** 교수/관리자: 직접 게시 저장 */
    @PutMapping("/projects/{projectId}/overview")
    @Transactional
    public ProjectOverviewDto put(@PathVariable Long projectId, @RequestBody OverviewBody body, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        if (!canPublish(ua)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_PROFESSOR");
        }
        return map(service.saveDirect(projectId, body.markdown(), ua));
    }

    /** 프로젝트 멤버만: 제안 제출(검토 대기) */
    @PostMapping("/projects/{projectId}/overview/submit")
    @Transactional
    public ProjectOverviewDto submit(@PathVariable Long projectId, @RequestBody OverviewBody body, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        if (!isProjectMember(projectId, ua.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");
        }
        return map(service.submitProposal(projectId, body.markdown(), ua));
    }

    /** 교수/관리자: 제안 승인 */
    @PostMapping("/projects/{projectId}/overview/approve")
    @Transactional
    public ProjectOverviewDto approve(@PathVariable Long projectId, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        if (!canPublish(ua)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_PROFESSOR");
        }
        return map(service.approve(projectId, ua));
    }

    /** 교수/관리자: 제안 반려 */
    @PostMapping("/projects/{projectId}/overview/reject")
    @Transactional
    public ProjectOverviewDto reject(@PathVariable Long projectId, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        if (!canPublish(ua)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_PROFESSOR");
        }
        return map(service.reject(projectId));
    }
}