package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "decision", indexes = @Index(name = "idx_decision_project", columnList = "project_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Decision {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String context;

    @Column(length = 1000)
    private String options;

    @Column(length = 1000)
    private String decision;

    @Column(length = 1000)
    private String consequences;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private UserAccount decidedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}