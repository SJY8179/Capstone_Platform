package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentReview;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public class AssignmentReviewDto {

    private static final DateTimeFormatter ISO_OFS = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    public record LogItem(
            Long id,
            Long reviewerId,
            String reviewerName,
            String decision, // "APPROVE" | "REJECT"
            String comment,
            String createdAt // ISO_OFFSET_DATE_TIME
    ) {
        public static LogItem of(AssignmentReview r, ZoneId zone) {
            String createdIso = r.getCreatedAt() == null
                    ? null
                    : r.getCreatedAt().atZone(zone).toOffsetDateTime().format(ISO_OFS);
            return new LogItem(
                    r.getId(),
                    r.getReviewerId(),
                    r.getReviewerName(),
                    r.getDecision() != null ? r.getDecision().name() : null,
                    r.getComment(),
                    createdIso
            );
        }
    }
}