package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping // context-path=/api 적용됨 → /api/...
public class ProjectController {
    private final ProjectService projectService;

    /** 전체 프로젝트 목록: /api/projects (관리자 용도, 현재는 인증만 요구) */
    @GetMapping("/projects")
    public List<ProjectListDto> list() {
        return projectService.listProjects();
    }

    /** 내가 속한 프로젝트(+교수 담당 프로젝트 포함): /api/projects/my  — ★일관된 DTO로 반환 */
    @GetMapping("/projects/my")
    @Transactional(readOnly = true)
    public List<ProjectListDto> my(Authentication auth) {
        UserAccount ua = ensureUser(auth);
        return projectService.listProjectsForUser(ua);
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
