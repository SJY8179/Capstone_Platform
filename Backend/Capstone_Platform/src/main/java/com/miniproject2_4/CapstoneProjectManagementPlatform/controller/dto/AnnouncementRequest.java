package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import jakarta.validation.constraints.NotBlank;

public record AnnouncementRequest(
    @NotBlank(message = "제목은 비워둘 수 없습니다.")
    String title,

    @NotBlank(message = "내용은 비워둘 수 없습니다.")
    String content
) {}