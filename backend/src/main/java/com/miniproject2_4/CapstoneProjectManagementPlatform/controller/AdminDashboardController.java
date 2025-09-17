package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/dashboard")
public class AdminDashboardController {

    private final DashboardService dashboardService;

    /** 관리자 요약: 전체 사용자, 활성 과목, 진행 프로젝트, 가동률 */
    @GetMapping("/summary")
    public DashboardService.AdminSummary getAdminSummary() {
        return dashboardService.getAdminSummary();
    }

    /** 관리자 최근 시스템 활동: 전 프로젝트의 이벤트 최신순 */
    @GetMapping("/activity")
    public List<DashboardService.ActivityItem> getRecentActivities(
            @RequestParam(name = "limit", defaultValue = "20") int limit
    ) {
        return dashboardService.getRecentActivities(limit);
    }
}