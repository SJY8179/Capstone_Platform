package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import java.util.List;

public class ProfessorReviewDto {

    /** 목록 아이템 (대시보드 검토대기 리스트) */
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

    /** 일괄 처리 요청 아이템 - 코멘트 지원 */
    public record BulkItem(Long assignmentId, Long projectId, String comment) {}

    public enum Action { APPROVE, REJECT }

    /** 일괄 요청 페이로드 */
    public record BulkRequest(Action action, List<BulkItem> items) {}

    /** 일괄 처리 결과 */
    public record BulkResult(int successCount, int failCount, List<Long> failedIds) {}

    /** 메모 단독 저장 요청 (프런트에서 { assignmentId, comment }로 보냄) */
    public record NoteRequest(Long assignmentId, String comment) {}

    /** 검토 이력 항목 */
    public record HistoryItem(
            Long id,
            String decision,     // "APPROVE" | "REJECT" | "NOTE"
            String comment,
            String createdAt,    // ISO_OFFSET_DATE_TIME
            Long reviewerId,
            String reviewerName
    ) {}
}