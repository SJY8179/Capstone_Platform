package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/projects/{projectId}")
public class DashboardController {

    private final DashboardService dashboardService;

    // GET /api/projects/{projectId}/dashboard/summary
    @GetMapping("/dashboard/summary")
    public DashboardService.Summary getSummary(@PathVariable Long projectId) {
        return dashboardService.getSummary(projectId);
    }

    // GET /api/projects/{projectId}/dashboard/status
    @GetMapping("/dashboard/status")
    public DashboardService.Status getStatus(@PathVariable Long projectId) {
        return dashboardService.getStatus(projectId);
    }

    // GET /api/projects/{projectId}/dashboard/deadlines?limit=5
    @GetMapping("/dashboard/deadlines")
    public List<DashboardService.DeadlineItem> getDeadlines(
            @PathVariable Long projectId,
            @RequestParam(name = "limit", defaultValue = "5") int limit
    ) {
        return dashboardService.getDeadlines(projectId, limit);
    }
}
