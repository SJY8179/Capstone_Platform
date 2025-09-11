package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectCreateReq;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectUpdateReq;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping // context-path=/api 적용됨 → /api/...
public class ProjectController {
    private final ProjectService projectService;
    private final ProjectRepository projectRepository;

    /** 전체 프로젝트 목록: /api/projects */
    @GetMapping("/projects")
    public List<ProjectListDto> list() {
        return projectService.listProjects();
    }

    /** 내가 속한 프로젝트 목록: /api/projects/my */
    @GetMapping("/projects/my")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> my(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 올바르지 않습니다.");
        }

        List<Project> projects = projectRepository.findAllByMemberUserId(ua.getId());

        return projects.stream()
                .map(prj -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", prj.getId());
                    String title = prj.getTitle();
                    m.put("name", title);
                    m.put("title", title);
                    String teamName = (prj.getTeam() != null) ? prj.getTeam().getName() : null;
                    m.put("team", teamName);
                    m.put("isMember", Boolean.TRUE);
                    return m;
                })
                .collect(Collectors.toList());
    }

    /** 프로젝트 생성: POST /api/projects */
    @PostMapping("/projects")
    public ProjectListDto create(@RequestBody ProjectCreateReq req, Authentication auth) {
        UserAccount ua = requireUser(auth);
        return projectService.createProject(ua, req);
    }

    /** 프로젝트 수정: PUT /api/projects/{id} */
    @PutMapping("/projects/{id}")
    public ProjectListDto update(@PathVariable Long id, @RequestBody ProjectUpdateReq req, Authentication auth) {
        UserAccount ua = requireUser(auth);
        return projectService.updateProject(ua, id, req);
    }

    /** 프로젝트 삭제: DELETE /api/projects/{id} */
    @DeleteMapping("/projects/{id}")
    public void delete(@PathVariable Long id, Authentication auth) {
        UserAccount ua = requireUser(auth);
        projectService.deleteProject(ua, id);
    }

    // --- 공통 인증 헬퍼 ---
    private UserAccount requireUser(Authentication auth) {
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
