package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.FeedbackDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/projects/{projectId}")
public class FeedbackController {
    private final FeedbackService feedbackService;

    @GetMapping("/feedback")
    public List<FeedbackDto> list(@PathVariable Long projectId,
                                  @RequestParam(name = "limit", defaultValue = "3") int limit) {
        return feedbackService.list(projectId, limit);
    }
}
