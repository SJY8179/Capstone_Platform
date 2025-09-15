package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ScheduleDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ScheduleService;
import com.miniproject2_4.CapstoneProjectManagementPlatform.util.ProjectAccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping // context-path=/api
public class ScheduleController {

    private final ScheduleService scheduleService;
    private final ProjectAccessGuard projectAccessGuard;

    private Long currentUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        Object p = auth.getPrincipal();
        if (p instanceof UserAccount ua) return ua.getId();
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 올바르지 않습니다.");
    }

    private UserAccount currentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }
        Object p = auth.getPrincipal();
        if (p instanceof UserAccount ua) return ua;
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
    }

    @GetMapping("/schedules")
    public List<ScheduleDto> list() {
        return scheduleService.listSchedules();
    }

    /**
     * (레거시) /api/schedules/range
     * - 교수/관리자도 볼 수 있게 가드를 'assertCanViewProject'로 완화
     * - projectId 없으면 빈 배열
     */
    @GetMapping("/schedules/range")
    public List<ScheduleDto> listInRangeLegacy(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long teamId,
            @RequestParam(defaultValue = "false") boolean onlyEvents,
            Authentication auth
    ) {
        if (projectId == null) return Collections.emptyList();

        // ✅ 교수/관리자/팀 멤버 모두 열람 허용
        projectAccessGuard.assertCanViewProject(projectId, currentUser(auth));

        LocalDate fromD = LocalDate.parse(from);
        LocalDate toD   = LocalDate.parse(to);
        return scheduleService.listSchedulesInRange(projectId, teamId, fromD, toD, onlyEvents);
    }

    /**
     * ✅ 정식 경로: /api/projects/{projectId}/schedules/range?from=YYYY-MM-DD&to=YYYY-MM-DD&onlyEvents=true
     */
    @GetMapping("/projects/{projectId}/schedules/range")
    public List<ScheduleDto> listInRange(
            @PathVariable Long projectId,
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) Long teamId,
            @RequestParam(defaultValue = "false") boolean onlyEvents,
            Authentication auth
    ) {
        projectAccessGuard.assertCanViewProject(projectId, currentUser(auth));

        LocalDate fromD = LocalDate.parse(from);
        LocalDate toD   = LocalDate.parse(to);
        return scheduleService.listSchedulesInRange(projectId, teamId, fromD, toD, onlyEvents);
    }
}