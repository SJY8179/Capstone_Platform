package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateProjectRequest(
        @NotBlank(message = "프로젝트 이름은 필수입니다.")
        @Size(max = 100, message = "프로젝트 이름은 100자를 초과할 수 없습니다.")
        String title,

        @Size(max = 500, message = "프로젝트 설명은 500자를 초과할 수 없습니다.")
        String description,

        @NotNull(message = "팀을 선택해야 합니다.")
        Long teamId
) {}