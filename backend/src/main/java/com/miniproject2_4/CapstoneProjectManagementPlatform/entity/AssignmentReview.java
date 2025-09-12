package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignment_review")
@Getter @Setter
public class AssignmentReview {

    public enum Decision {
        APPROVE, REJECT, NOTE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 어떤 과제의 리뷰인지 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private Assignment assignment;

    /** 처리/기록 유형 */
    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false, length = 16)
    private Decision decision;

    /** 코멘트/사유 */
    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    /** 작성자 */
    @Column(name = "reviewer_id")
    private Long reviewerId;

    @Column(name = "reviewer_name")
    private String reviewerName;

    /** 생성 시각 */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (decision == null) decision = Decision.NOTE;
    }
}
