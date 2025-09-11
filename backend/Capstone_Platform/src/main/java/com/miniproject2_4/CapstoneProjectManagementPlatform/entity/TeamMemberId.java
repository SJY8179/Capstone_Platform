package com.miniproject2_4.CapstoneProjectManagementPlatform.entity;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class TeamMemberId implements Serializable {
    private Long teamId;
    private Long userId;
}
