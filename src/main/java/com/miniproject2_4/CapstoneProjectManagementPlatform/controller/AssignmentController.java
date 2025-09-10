package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.AssignmentDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.RequestReviewDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Assignment;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.AssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/projects/{projectId}/assignments")
public class AssignmentController {

    private final AssignmentService assignmentService;

    // 요청 바디
    public record CreateReq(String title, String dueDateIso, AssignmentStatus status) {}
    public record UpdateReq(String title, String dueDateIso, AssignmentStatus status) {}

    /** 일괄 상태 변경 요청 바디 */
    public record BulkReq(List<Long> assignmentIds, AssignmentStatus status) {}

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

    /** POST /api/projects/{projectId}/assignments/status-bulk
     * 같은 프로젝트에 속한 과제들에 한해 일괄 상태 변경.
     * 잘못된 ID(다른 프로젝트 소속)는 조용히 무시합니다.
     */
    @PostMapping("/status-bulk")
    @Transactional
    public void bulkChange(@PathVariable Long projectId, @RequestBody BulkReq req) {
        if (req.assignmentIds() == null || req.assignmentIds().isEmpty()) return;
        AssignmentStatus target = req.status() != null ? req.status() : AssignmentStatus.COMPLETED;
        for (Long id : req.assignmentIds()) {
            try {
                assignmentService.changeStatus(projectId, id, target);
            } catch (IllegalArgumentException ignore) {
                // 다른 프로젝트 소속/없는 ID 등은 무시
            }
        }
    }

    /** PATCH /api/projects/{projectId}/assignments/{id}/request-review
     * 학생(팀 구성원)이 검토 요청: ONGOING -> PENDING
     * - userId 취득 방식은 프로젝트 환경에 따라 다를 수 있어,
     *   우선 선택 헤더(X-USER-ID)를 지원하고(null이면 권한검사 생략).
     *   보안 강화를 원하면 SecurityContext로 대체하세요.
     */
    @PatchMapping("/{id}/request-review")
    public AssignmentDto requestReview(@PathVariable Long projectId,
                                       @PathVariable Long id,
                                       @RequestBody(required = false) RequestReviewDto body,
                                       @RequestHeader(name = "X-USER-ID", required = false) Long userIdOptional) {
        Assignment a = assignmentService.requestReview(projectId, id, userIdOptional,
                body != null ? body.message() : null);
        return AssignmentDto.of(a);
    }
}
