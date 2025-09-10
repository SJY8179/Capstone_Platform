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

    @GetMapping("/schedules")
    public List<ScheduleDto> list() {
        return scheduleService.listSchedules();
    }

    /** /api/schedules/range?from=YYYY-MM-DD&to=YYYY-MM-DD&projectId=1&onlyEvents=true */
    @GetMapping("/schedules/range")
    public List<ScheduleDto> listInRange(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Long teamId,
            @RequestParam(defaultValue = "false") boolean onlyEvents,
            Authentication auth
    ) {
        // projectId가 없으면 프론트는 빈 캘린더를 원함 → 빈 배열 반환
        if (projectId == null) {
            return Collections.emptyList();
        }
        projectAccessGuard.assertMember(projectId, currentUserId(auth));
        LocalDate fromD = LocalDate.parse(from);
        LocalDate toD   = LocalDate.parse(to);
        return scheduleService.listSchedulesInRange(projectId, teamId, fromD, toD, onlyEvents);
    }
}