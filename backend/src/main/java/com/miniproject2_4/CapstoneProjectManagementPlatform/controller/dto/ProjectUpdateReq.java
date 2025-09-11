package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ProjectUpdateReq {
    private String title;          // null이면 변경 없음
    private String description;    // null이면 변경 없음 (현재 Project 엔티티에 없음 - 주석처리)
    private LocalDate startDate;   // null이면 변경 없음 (현재 Project 엔티티에 없음 - 주석처리)
    private LocalDate endDate;     // null이면 변경 없음 (현재 Project 엔티티에 없음 - 주석처리)
    // 팀 이동은 초기 스코프에선 비활성(필요하면 teamId 추가)
}