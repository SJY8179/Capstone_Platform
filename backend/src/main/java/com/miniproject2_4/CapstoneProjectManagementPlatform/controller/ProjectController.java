package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.CreateProjectRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectDetailDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping // context-path=/api 적용됨 → /api/...
public class ProjectController {
    private final ProjectService projectService;

    /** 전체 프로젝트 목록: /api/projects (관리자 용도, 현재는 인증만 요구)
     * Query param: status=active|archived (default: active)
     */
    @GetMapping("/projects")
    public List<ProjectListDto> list(@RequestParam(defaultValue = "active") String status, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        return projectService.listProjectsForUser(ua, status);
    }

    /** 새 프로젝트 생성: /api/projects */
    @PostMapping("/projects")
    @Transactional
    public ProjectListDto createProject(@Valid @RequestBody CreateProjectRequest request, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        return projectService.createProject(request, ua);
    }

    /** 내가 속한 프로젝트(+교수 담당 프로젝트 포함): /api/projects/my  — ★일관된 DTO로 반환 */
    @GetMapping("/projects/my")
    @Transactional(readOnly = true)
    public List<ProjectListDto> my(Authentication auth) {
        UserAccount ua = ensureUser(auth);
        return projectService.listProjectsForUser(ua);
    }

    /** 단건 상세: /api/projects/{id} */
    @GetMapping("/projects/{id}")
    @Transactional(readOnly = true)
    public ProjectDetailDto getOne(@PathVariable Long id, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        return projectService.getProjectDetail(id, ua);
    }

    /** (옵션) 교수 전용: 담당 프로젝트 목록 — 프론트 폴백에서 호출 가능 */
    @GetMapping("/projects/teaching")
    @Transactional(readOnly = true)
    public List<ProjectListDto> teaching(Authentication auth) {
        UserAccount ua = ensureUser(auth);
        if (ua.getRole() == Role.ADMIN) {
            return projectService.listProjects(); // 관리자면 전체
        }
        if (ua.getRole() != Role.PROFESSOR) {
            return List.of(); // 학생이면 빈 배열
        }
        return projectService.listProjectsByProfessor(ua.getId());
    }

    /** 깃허브 링크(소유자/레포) 업데이트: 관리자/교수는 제한 없이, 학생은 해당 프로젝트 멤버일 때만 */
    public record RepoUpdateRequest(String githubUrl) {}

    @PutMapping("/projects/{id}/repo")
    @Transactional
    public ProjectDetailDto updateRepo(@PathVariable Long id, @RequestBody RepoUpdateRequest body, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        String url = body == null ? null : body.githubUrl();
        return projectService.updateGithubUrl(id, url, ua);
    }

    /** Archive project (soft delete): DELETE /api/projects/{id} */
    @DeleteMapping("/projects/{id}")
    @Transactional
    public ResponseEntity<Void> archiveProject(@PathVariable Long id, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        projectService.archiveProject(id, ua);
        return ResponseEntity.noContent().build();
    }

    /** Restore project from archive: POST /api/projects/{id}/restore */
    @PostMapping("/projects/{id}/restore")
    @Transactional
    public ResponseEntity<Void> restoreProject(@PathVariable Long id, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        projectService.restoreProject(id, ua);
        return ResponseEntity.ok().build();
    }

    /** Permanently delete project: DELETE /api/projects/{id}/purge */
    @DeleteMapping("/projects/{id}/purge")
    @Transactional
    public ResponseEntity<Void> purgeProject(@PathVariable Long id, Authentication auth) {
        UserAccount ua = ensureUser(auth);
        projectService.purgeProject(id, ua);
        return ResponseEntity.noContent().build();
    }

    private UserAccount ensureUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 올바르지 않습니다.");
        }
        return ua;
    }
}