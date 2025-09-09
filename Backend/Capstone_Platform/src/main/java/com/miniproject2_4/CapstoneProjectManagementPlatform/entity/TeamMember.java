package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "team_member")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TeamMember {

    @EmbeddedId
    private TeamMemberId id;

    @ManyToOne(fetch = FetchType.LAZY) @MapsId("teamId")
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY) @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    /** LEADER / MEMBER */
    @Column(name = "role_in_team", length = 20)
    private String roleInTeam;
}
