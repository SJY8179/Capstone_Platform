package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "project_overview",
        indexes = @Index(name = "uk_overview_project", columnList = "project_id", unique = true))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProjectOverview {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 1:1 (프로젝트별 단일 개요) */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    private Project project;

    /** 게시된 본문 (Markdown) */
    @Lob
    @Column(name = "markdown", columnDefinition = "LONGTEXT")
    private String markdown;

    /** 제안 상태: 게시(PUBLISHED) 또는 제안 대기(PENDING) */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private Status status;

    /** 게시본 버전(승인 시 +1) */
    @Column(name = "version", nullable = false)
    private int version;

    /** 게시본 갱신 정보 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private UserAccount updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** 검토 대기 중인 제안본 */
    @Lob @Column(name = "pending_markdown", columnDefinition = "LONGTEXT")
    private String pendingMarkdown;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pending_author")
    private UserAccount pendingAuthor;

    @Column(name = "pending_at")
    private LocalDateTime pendingAt;

    public enum Status { PUBLISHED, PENDING }
}
