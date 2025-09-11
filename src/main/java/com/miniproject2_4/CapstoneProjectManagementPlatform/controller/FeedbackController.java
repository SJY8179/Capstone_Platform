package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.FeedbackDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.FeedbackRequests;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.FeedbackService;
import com.miniproject2_4.CapstoneProjectManagementPlatform.util.ProjectAccessGuard;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/projects/{projectId}")
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final ProjectAccessGuard projectAccessGuard;

    private UserAccount currentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }
        return (UserAccount) auth.getPrincipal();
    }

    /** 목록 조회 (보기 권한 필요) */
    @GetMapping("/feedback")
    public ResponseEntity<List<FeedbackDto>> list(@PathVariable Long projectId,
                                                  @RequestParam(name = "limit", defaultValue = "3") int limit,
                                                  Authentication auth) {
        projectAccessGuard.assertCanViewProject(projectId, currentUser(auth));
        return ResponseEntity.ok(feedbackService.list(projectId, limit));
    }

    /** 생성 (ADMIN 또는 담당 교수) */
    @PostMapping("/feedback")
    public ResponseEntity<FeedbackDto> create(@PathVariable Long projectId,
                                              @RequestBody @Valid FeedbackRequests.Create req,
                                              Authentication auth) {
        var user = currentUser(auth);
        projectAccessGuard.assertCanGiveFeedback(projectId, user);
        var created = feedbackService.create(projectId, user, req.content());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** 수정 (ADMIN 또는 담당 교수) */
    @PatchMapping("/feedback/{id}")
    public ResponseEntity<FeedbackDto> update(@PathVariable Long projectId,
                                              @PathVariable Long id,
                                              @RequestBody @Valid FeedbackRequests.Update req,
                                              Authentication auth) {
        var user = currentUser(auth);
        projectAccessGuard.assertCanGiveFeedback(projectId, user);
        var updated = feedbackService.update(projectId, id, req.content());
        return ResponseEntity.ok(updated);
    }

    /** 삭제 (ADMIN 또는 담당 교수) */
    @DeleteMapping("/feedback/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long projectId,
                                       @PathVariable Long id,
                                       Authentication auth) {
        var user = currentUser(auth);
        projectAccessGuard.assertCanGiveFeedback(projectId, user);
        feedbackService.delete(projectId, id);
        return ResponseEntity.noContent().build();
    }
}
