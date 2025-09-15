package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import java.util.List;

public record CursorPage<T>(List<T> items, Long nextCursor) {}