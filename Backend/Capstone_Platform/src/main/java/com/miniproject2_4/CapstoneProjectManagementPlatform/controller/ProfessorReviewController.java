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
@RequestMapping("/professor/reviews")
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

    /**
     * 교수 검토 목록 조회 (PENDING + ONGOING 마감임박/지남)
     * GET /api/professor/reviews?days=7&limit=50
     */
    @GetMapping
    public List<ProfessorReviewDto.ReviewItem> list(
            Authentication auth,
            @RequestParam(name = "days", defaultValue = "7") int days,
            @RequestParam(name = "limit", defaultValue = "50") int limit
    ) {
        Long userId = currentUserId(auth);
        return reviewService.listPendingReviews(userId, days, limit);
    }

    /**
     * 일괄 승인/반려
     * POST /api/professor/reviews/bulk
     */
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
}
