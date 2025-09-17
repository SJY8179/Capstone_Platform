package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Team;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.TeamMember;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.format.DateTimeFormatter;
import java.util.List;

public final class TeamListDto {
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** 팀 생성 요청 */
    public record CreateRequest(
            @NotBlank(message = "팀 이름은 필수입니다.")
            @Size(max = 80, message = "팀 이름은 80자를 초과할 수 없습니다.")
            String name,
            String description
    ) {}

    /** 팀 수정 요청 */
    public record UpdateRequest(
            @NotBlank(message = "팀 이름은 필수입니다.")
            @Size(max = 80, message = "팀 이름은 80자를 초과할 수 없습니다.")
            String name,
            String description
    ) {}

    /** 팀 리더 변경 요청 */
    public record ChangeLeaderRequest(
            @NotNull(message = "변경할 리더의 ID는 필수입니다.")
            Long newLeaderId
    ) {}

    /** 팀 목록/상세 응답 */
    public record Response(
            Long id,
            String name,
            String project,
            String description,
            Person leader,
            List<Member> members,
            Stats stats,
            String createdAt,
            String lastActivity
    ) {
        public record Person(String name, String email, String avatar) {}
        public record Member(Long id, String name, String email, String avatar, String role, String status, String userRole) {}
        public record Stats(int commits, int meetings, Tasks tasks) {}
        public record Tasks(int completed, int total) {}

        /**
         * 엔티티 → 응답 DTO 매핑
         */
        public static Response from(Team team, List<TeamMember> teamMembers, String projectTitle, Stats stats) {
            List<TeamMember> tms = (teamMembers == null) ? List.of() : teamMembers;

            Person leader = tms.stream()
                    .filter(tm -> "LEADER".equalsIgnoreCase(tm.getRoleInTeam()))
                    .findFirst()
                    .map(tm -> new Person(
                            tm.getUser().getName(),
                            tm.getUser().getEmail(),
                            tm.getUser().getAvatarUrl()
                    ))
                    .orElse(null);

            List<Member> members = tms.stream()
                    .map(tm -> new Member(
                            tm.getUser().getId(),
                            tm.getUser().getName(),
                            tm.getUser().getEmail(),
                            tm.getUser().getAvatarUrl(),
                            "LEADER".equalsIgnoreCase(tm.getRoleInTeam()) ? "leader" : "member",
                            "active",
                            tm.getUser().getRole().name()
                    ))
                    .toList();

            String createdAt = team.getCreatedAt() != null ? team.getCreatedAt().format(ISO_FORMATTER) : null;
            String lastActivity = team.getUpdatedAt() != null ? team.getUpdatedAt().format(ISO_FORMATTER) : createdAt;

            return new Response(
                    team.getId(),
                    team.getName(),
                    projectTitle,
                    team.getDescription(),
                    leader,
                    members,
                    stats,
                    createdAt,
                    lastActivity
            );
        }
    }
}
