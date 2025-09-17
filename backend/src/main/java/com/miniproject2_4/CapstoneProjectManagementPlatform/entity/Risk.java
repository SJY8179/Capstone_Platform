package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "risk", indexes = @Index(name = "idx_risk_project", columnList = "project_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Risk {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id")
    private Project project;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private int impact;       // 1~5

    @Column(nullable = false)
    private int likelihood;   // 1~5

    @Column(length = 500)
    private String mitigation;

    @Column(length = 100)
    private String owner;

    private LocalDateTime dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Status { OPEN, MITIGATING, CLOSED }
}