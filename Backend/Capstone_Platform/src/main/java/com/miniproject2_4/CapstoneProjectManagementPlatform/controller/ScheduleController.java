package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ScheduleDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping // context-path=/api
public class ScheduleController {

    private final ScheduleService scheduleService;

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
            @RequestParam(defaultValue = "false") boolean onlyEvents
    ) {
        return scheduleService.listSchedulesInRange(
                projectId, teamId, LocalDate.parse(from), LocalDate.parse(to), onlyEvents
        );
    }
}
