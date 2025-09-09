package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import java.util.List;

public record TeamListDto(
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
    public record Member(Long id, String name, String email, String avatar, String role, String status) {}
    public record Stats(int commits, int meetings, Tasks tasks) {}
    public record Tasks(int completed, int total) {}
}