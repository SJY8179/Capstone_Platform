package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.TeamListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.UserDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping // context-path=/api 적용됨 → /api/teams
public class TeamController {
    private final TeamService teamService;

    @GetMapping("/teams")
    public List<TeamListDto> list() {
        return teamService.listTeams();
    }

    @GetMapping("/teams/{teamId}/invitable-users")
    public List<UserDto> getInvitableUsers(@PathVariable Long teamId) {
        return teamService.findInvitableUsers(teamId);
    }
}
