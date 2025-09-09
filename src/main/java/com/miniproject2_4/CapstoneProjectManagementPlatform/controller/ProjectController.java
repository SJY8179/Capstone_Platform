package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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

    @GetMapping("/projects")
    public List<ProjectListDto> list() {
        return projectService.listProjects();
    }

    /** 내가 속한 프로젝트 목록: /api/projects/my */
    @GetMapping("/projects/my")
    public List<Map<String, Object>> my(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 올바르지 않습니다.");
        }

        List<Project> projects = projectRepository.findAllByMemberUserId(ua.getId());

        // 타입 추론 문제 방지를 위해 명시적 Map 생성 사용
        return projects.stream()
                .map(prj -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", prj.getId());
                    m.put("title", prj.getTitle());
                    m.put("isMember", Boolean.TRUE);
                    return m;
                })
                .collect(Collectors.toList());
    }
}
