package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "team_invitation")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class TeamInvitation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "inviter_id", nullable = false)
    private UserAccount inviter;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "invitee_id", nullable = false)
    private UserAccount invitee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TeamInvitationStatus status;

    @Column(length = 255)
    private String message;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime decidedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = TeamInvitationStatus.PENDING;
    }
}
