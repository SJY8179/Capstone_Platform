package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "team_invitation")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TeamInvitation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount invitee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inviter_id", nullable = false)
    private UserAccount inviter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RequestStatus status;
}