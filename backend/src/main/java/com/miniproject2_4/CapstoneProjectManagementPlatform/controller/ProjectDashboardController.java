package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(value = "/projects/{projectId}", produces = MediaType.APPLICATION_JSON_VALUE)
public class ProjectDashboardController {

    private final DashboardService dashboardService;

    /** 대시보드 요약 카드 */
    @GetMapping("/dashboard/summary")
    public DashboardService.Summary getSummary(@PathVariable Long projectId) {
        return dashboardService.getSummary(projectId);
    }

    /** 프로젝트 상태(진행률/최근 업데이트/가이드 액션) */
    @GetMapping("/status")
    public DashboardService.Status getStatus(@PathVariable Long projectId) {
        return dashboardService.getStatus(projectId);
    }

    /** 다가오는 마감 */
    @GetMapping("/deadlines")
    public List<DashboardService.DeadlineItem> getDeadlines(
            @PathVariable Long projectId,
            @RequestParam(name = "limit", defaultValue = "5") int limit
    ) {
        return dashboardService.getDeadlines(projectId, limit);
    }
}
