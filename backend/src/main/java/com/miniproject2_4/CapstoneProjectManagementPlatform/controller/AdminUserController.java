package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.AdminUserDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.AdminUserSummaryDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Role;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/users") // /api/admin/users
public class AdminUserController {

    private final UserService userService;

    /** 상단 카드용 집계 */
    @GetMapping("/summary")
    public AdminUserSummaryDto getSummary(
            @RequestParam(name = "activeDays", defaultValue = "30") int activeDays
    ) {
        return userService.getAdminUserSummary(activeDays);
    }

    /** 관리자 전용 사용자 목록/검색/필터(역할) */
    @GetMapping
    public List<AdminUserDto> list(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size,
            @RequestParam(name = "activeDays", defaultValue = "30") int activeDays
    ) {
        Role roleEnum = parseRole(role);
        return userService.getAdminUsers(q, roleEnum, page, size, activeDays);
    }

    private Role parseRole(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim().toUpperCase();
        try { return Role.valueOf(s); }
        catch (IllegalArgumentException ignore) { return null; }
    }
}
