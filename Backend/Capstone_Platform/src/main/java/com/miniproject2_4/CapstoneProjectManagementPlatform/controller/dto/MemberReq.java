package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import jakarta.validation.constraints.NotNull;

public record MemberReq(@NotNull Long userId) {}