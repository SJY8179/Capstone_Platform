package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ProjectCreateReq {
    private String title;          // 필수
    private String description;    // 선택 (현재 Project 엔티티에 없음 - 주석처리)
    private Long teamId;           // 선택(팀 소속 프로젝트가 아니면 null)
    private LocalDate startDate;   // 선택 (현재 Project 엔티티에 없음 - 주석처리)
    private LocalDate endDate;     // 선택 (현재 Project 엔티티에 없음 - 주석처리)
}