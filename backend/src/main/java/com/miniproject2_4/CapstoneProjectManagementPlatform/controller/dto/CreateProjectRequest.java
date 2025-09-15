package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProjectRequest(
        @NotBlank(message = "프로젝트 이름은 필수입니다.")
        @Size(max = 100, message = "프로젝트 이름은 100자를 초과할 수 없습니다.")
        String title,

        @Size(max = 500, message = "프로젝트 설명은 500자를 초과할 수 없습니다.")
        String description,

        @NotBlank(message = "팀 이름은 필수입니다.")
        @Size(max = 80, message = "팀 이름은 80자를 초과할 수 없습니다.")
        String teamName,

        @Size(max = 200, message = "팀 설명은 200자를 초과할 수 없습니다.")
        String teamDescription
) {}