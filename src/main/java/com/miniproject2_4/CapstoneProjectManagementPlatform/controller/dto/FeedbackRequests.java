package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import jakarta.validation.constraints.NotBlank;

public final class FeedbackRequests {
    private FeedbackRequests() {}

    public record Create(
            @NotBlank String content
    ) {}

    public record Update(
            @NotBlank String content
    ) {}
}
