package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
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

    /** (관리자/전체 조회) */
    @GetMapping("/teams")
    public List<TeamListDto> list() {
        return teamService.listTeams();
    }

    /** 내가 속한 팀만 */
    @GetMapping("/teams/my")
    public List<TeamListDto> my(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        return teamService.listTeamsForUser(ua.getId());
    }
}