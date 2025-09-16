package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
public class CreateProjectRequest {

    @NotBlank(message = "프로젝트 제목은 필수입니다.")
    private String title;

    @NotNull(message = "teamId는 필수입니다.")
    private Long teamId;

    /** 선택: 명시적으로 담당 교수 지정 */
    private Long professorId;
}
