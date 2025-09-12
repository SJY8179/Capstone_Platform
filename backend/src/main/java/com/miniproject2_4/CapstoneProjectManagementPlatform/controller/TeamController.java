package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping // context-path=/api 적용됨 → /api/teams
public class TeamController {
    private final TeamService teamService;

    private UserAccount currentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        return (UserAccount) auth.getPrincipal();
    }

    /** (관리자) 전체 팀 조회: /api/teams */
    @GetMapping("/teams")
    public List<TeamListDto> list(Authentication auth) {
        UserAccount ua = currentUser(auth);
        if (ua.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_ALLOWED_TO_VIEW");
        }
        return teamService.listTeams();
    }

    /** (학생/교수/관리자 공통) 내가 '팀 멤버'로 속한 팀: /api/teams/my */
    @GetMapping("/teams/my")
    public List<TeamListDto> my(Authentication auth) {
        UserAccount ua = currentUser(auth);
        return teamService.listTeamsForUser(ua.getId());
    }

    /** (교수 전용) 내가 '담당 교수'인 프로젝트의 팀: /api/teams/teaching */
    @GetMapping("/teams/teaching")
    public List<TeamListDto> teaching(Authentication auth) {
        UserAccount ua = currentUser(auth);
        if (ua.getRole() == Role.ADMIN) {
            // 관리자는 전체를 보는 게 자연스럽지만, 사용처는 교수용이므로 전체 허용(요청에 따라 바꿔도 됨)
            return teamService.listTeams();
        }
        if (ua.getRole() != Role.PROFESSOR) {
            // 학생 등은 접근 대상 아님
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_ALLOWED_TO_VIEW");
        }
        return teamService.listTeamsForProfessor(ua.getId());
    }
}
