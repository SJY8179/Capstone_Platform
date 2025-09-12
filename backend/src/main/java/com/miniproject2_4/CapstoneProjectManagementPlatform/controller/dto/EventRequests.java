package com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;
import jakarta.validation.constraints.NotBlank;

/**
 * 이벤트 생성/수정 요청 DTO
 * - projectId 는 항상 PathVariable 로 전달 (바디에 포함하지 않음)
 * - 시간은 문자열 ISO 입력: "yyyy-MM-dd'T'HH:mm:ss" 또는 Offset(예: "...:00Z")
 *   Service.parseDateTime(...) 에서 유연히 파싱
 */
public class EventRequests {

    public record Create(
            @NotBlank String title,
            @NotBlank String startAtIso,   // 필수
            String endAtIso,               // 선택
            EventType type,                // null 이면 Service 에서 MEETING 기본값
            String location
    ) {}

    public record Update(
            String title,
            String startAtIso,
            String endAtIso,
            EventType type,
            String location
    ) {}
}
