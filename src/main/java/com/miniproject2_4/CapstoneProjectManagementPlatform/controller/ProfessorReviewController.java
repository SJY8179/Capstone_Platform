package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProfessorReviewDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.ProfessorReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/professor/reviews") // (앱 전역 prefix가 /api라면 그대로 사용)
public class ProfessorReviewController {

    private final ProfessorReviewService reviewService;

    private static Long currentUserId(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        Object principal = auth.getPrincipal();
        if (!(principal instanceof UserAccount ua)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증 정보가 올바르지 않습니다.");
        }
        return ua.getId();
    }

    /** 교수 검토 목록 조회 (PENDING) */
    @GetMapping
    public List<ProfessorReviewDto.ReviewItem> list(
            Authentication auth,
            @RequestParam(name = "days", defaultValue = "7") int days,
            @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        Long userId = currentUserId(auth);
        return reviewService.listPendingReviews(userId, days, limit);
    }

    /** 일괄 승인/반려 */
    @PostMapping("/bulk")
    public ProfessorReviewDto.BulkResult bulk(
            Authentication auth,
            @RequestBody ProfessorReviewDto.BulkRequest req
    ) {
        Long userId = currentUserId(auth);
        if (req == null || req.items() == null || req.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "처리할 항목이 없습니다.");
        }
        return reviewService.bulkReview(userId, req);
    }

    /** 메모 단독 저장 */
    @PostMapping("/note")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addNote(
            Authentication auth,
            @RequestBody ProfessorReviewDto.NoteRequest req
    ) {
        Long userId = currentUserId(auth);
        reviewService.addNote(userId, req);
    }

    /** 검토 이력 조회 */
    @GetMapping("/{assignmentId}/history")
    public List<ProfessorReviewDto.HistoryItem> history(
            Authentication auth,
            @PathVariable Long assignmentId
    ) {
        Long userId = currentUserId(auth);
        // 단순 조회: 소유/권한 검사는 서비스에서 과제 존재여부로 처리
        return reviewService.getHistory(assignmentId);
    }
}
