package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.AssignmentDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Assignment;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.AssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/projects/{projectId}/assignments")
public class AssignmentController {

    private final AssignmentService assignmentService;

    // 요청 바디를 위한 간단한 레코드
    public record CreateReq(String title, String dueDateIso, AssignmentStatus status) {}
    public record UpdateReq(String title, String dueDateIso, AssignmentStatus status) {}

    // GET /api/projects/{projectId}/assignments
    @GetMapping
    public List<AssignmentDto> list(@PathVariable Long projectId) {
        return assignmentService.listByProjectOrdered(projectId)
                .stream().map(AssignmentDto::of).toList();
    }

    // POST /api/projects/{projectId}/assignments
    @PostMapping
    public AssignmentDto create(@PathVariable Long projectId,
                                @RequestBody CreateReq req) {
        Assignment a = assignmentService.create(projectId, req.title(), req.dueDateIso(), req.status());
        return AssignmentDto.of(a);
    }

    // PATCH /api/projects/{projectId}/assignments/{id}
    @PatchMapping("/{id}")
    public AssignmentDto update(@PathVariable Long projectId,
                                @PathVariable Long id,
                                @RequestBody UpdateReq req) {
        Assignment a = assignmentService.update(projectId, id, req.title(), req.dueDateIso(), req.status());
        return AssignmentDto.of(a);
    }

    // PATCH /api/projects/{projectId}/assignments/{id}/status?value=COMPLETED
    @PatchMapping("/{id}/status")
    public AssignmentDto changeStatus(@PathVariable Long projectId,
                                      @PathVariable Long id,
                                      @RequestParam("value") AssignmentStatus value) {
        Assignment a = assignmentService.changeStatus(projectId, id, value);
        return AssignmentDto.of(a);
    }

    // DELETE /api/projects/{projectId}/assignments/{id}
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long projectId, @PathVariable Long id) {
        assignmentService.delete(projectId, id);
    }
}
