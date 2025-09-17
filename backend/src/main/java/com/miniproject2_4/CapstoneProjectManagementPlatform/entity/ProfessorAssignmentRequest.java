package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "professor_assignment_request",
        indexes = {
                @Index(name = "idx_par_project", columnList = "project_id"),
                @Index(name = "idx_par_team", columnList = "team_id"),
                @Index(name = "idx_par_target_professor", columnList = "target_professor"),
                @Index(name = "idx_par_status", columnList = "status")
        })
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class ProfessorAssignmentRequest extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 사후요청일 때: 대상 프로젝트(없을 수 있음) */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "project_id")
    private Project project;

    /** 사전/사후 공통: 팀 (사후요청은 project.team으로 채움) */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    /** 요청자(학생/교수/관리자 등) */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private UserAccount requestedBy;

    /** 지정 요청받은 교수 */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_professor", nullable = false)
    private UserAccount targetProfessor;

    /** 상태 */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private Status status;

    /** 메시지(선택) – 요청/거절 사유 등 */
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    /** (사전요청 전용) 프로젝트 제목 초안 – 승인 시 실제 프로젝트 생성에 사용 */
    @Column(name = "title", length = 200, nullable = false)
    private String title;

    /** 승인/거절 처리자(보통 교수 본인) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private UserAccount decidedBy;

    /** 승인/거절 시각 */
    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    public enum Status { PENDING, APPROVED, REJECTED }
}
