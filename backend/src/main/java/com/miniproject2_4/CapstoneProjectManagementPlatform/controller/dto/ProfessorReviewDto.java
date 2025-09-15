package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import java.util.List;

public class ProfessorReviewDto {

    /** 목록 아이템 */
    public record ReviewItem(
            Long assignmentId,
            Long projectId,
            String projectName,
            String teamName,
            String title,
            String submittedAt, // ISO_OFFSET_DATE_TIME
            String dueDate,     // ISO_OFFSET_DATE_TIME
            String status       // "PENDING" | "ONGOING" | "COMPLETED"
    ) {}

    /** 일괄 처리 요청 아이템 */
    public record BulkItem(Long assignmentId, Long projectId) {}

    public enum Action { APPROVE, REJECT }

    /** 일괄 요청 페이로드 */
    public record BulkRequest(Action action, List<BulkItem> items) {}

    /** 일괄 처리 결과 */
    public record BulkResult(int successCount, int failCount, List<Long> failedIds) {}
}
