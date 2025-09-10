package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "project")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Project extends BaseEntity {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id")
    private Team team;

    /** 담당 교수 (1명). 팀 멤버가 아니어도 지정 가능 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "professor_id")
    private UserAccount professor;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "github_repo", length = 100)
    private String githubRepo;

    @Column(name = "repo_owner", length = 50)
    private String repoOwner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;   // <-- DB 값: ACTIVE

    /** ProjectService에서 참조하는 중첩 enum */
    public enum Status {
        ACTIVE,        // 현재 DB에 들어있는 값
        PLANNING,
        IN_PROGRESS,
        REVIEW,
        COMPLETED
    }
}