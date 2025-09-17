package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProfessorAssignmentRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ProfessorAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping
public class ProfessorAssignmentController {

    private final ProfessorAssignmentService service;
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /* ---------- 공통 DTO ---------- */
    public record SimpleResp(Long id,
                             Long projectId,
                             String projectTitle,
                             Long targetProfessorId,
                             String targetProfessorName,
                             String status,
                             String requestedAt) {}

    private SimpleResp toResp(ProfessorAssignmentRequest r) {
        Long pid = (r.getProject() != null ? r.getProject().getId() : null);
        String ptitle = (r.getProject() != null ? r.getProject().getTitle() : r.getTitle());
        return new SimpleResp(
                r.getId(),
                pid,
                ptitle,
                r.getTargetProfessor().getId(),
                r.getTargetProfessor().getName(),
                r.getStatus().name(),
                r.getCreatedAt() != null ? r.getCreatedAt().format(ISO) : null
        );
    }

    /* ---------- 사전요청: 프로젝트 없이 생성 ---------- */
    // 프론트에서 professorId 또는 preferredProfessorId 둘 중 아무거나 올 수 있게 모두 받음
    public record CreatePreReq(Long teamId, String title, Long professorId, Long preferredProfessorId, String message) {}

    @PostMapping("/professor-requests")
    @Transactional
    public ResponseEntity<SimpleResp> createPre(@RequestBody CreatePreReq body,
                                                @AuthenticationPrincipal UserAccount user) {
        Long targetProfessorId = body.professorId() != null ? body.professorId() : body.preferredProfessorId();
        ProfessorAssignmentRequest r = service.createPreRequest(
                body.teamId(), body.title(), targetProfessorId, body.message(), user
        );
        return ResponseEntity.ok(toResp(r));
    }

    /* ---------- 사후요청: 기존 프로젝트에 대해 생성 ---------- */
    public record CreateReq(Long professorId, String message) {}

    @PostMapping("/projects/{projectId}/professor-requests")
    @Transactional
    public ResponseEntity<SimpleResp> create(@PathVariable Long projectId,
                                             @RequestBody CreateReq body,
                                             @AuthenticationPrincipal UserAccount user) {
        ProfessorAssignmentRequest r = service.createRequest(projectId, body.professorId(), body.message(), user);
        return ResponseEntity.ok(toResp(r));
    }

    /* ---------- 교수 본인 대기 요청 목록 ---------- */
    @GetMapping("/professor-requests/pending")
    @Transactional(readOnly = true)
    public ResponseEntity<List<SimpleResp>> listPending(@AuthenticationPrincipal UserAccount user) {
        List<ProfessorAssignmentRequest> rows = service.listPendingForProfessor(user.getId());
        return ResponseEntity.ok(rows.stream().map(this::toResp).toList());
    }

    /* ---------- 승인/거절 ---------- */
    @PostMapping("/professor-requests/{id}/approve")
    @Transactional
    public ResponseEntity<Void> approve(@PathVariable Long id,
                                        @AuthenticationPrincipal UserAccount user) {
        service.approve(id, user);
        return ResponseEntity.ok().build();
    }

    public record RejectReq(String message) {}
    @PostMapping("/professor-requests/{id}/reject")
    @Transactional
    public ResponseEntity<Void> reject(@PathVariable Long id,
                                       @RequestBody(required = false) RejectReq body,
                                       @AuthenticationPrincipal UserAccount user) {
        service.reject(id, body != null ? body.message() : null, user);
        return ResponseEntity.ok().build();
    }
}
