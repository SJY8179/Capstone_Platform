// EventController.java (베이스 경로에 /api 붙이지 않기)
package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.EventDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/projects/{projectId}")
public class EventController {

    private final EventService eventService;

    /* ===== 요청 바디용 내부 레코드 ===== */
    public record CreateReq(String title, String startAtIso, String endAtIso, EventType type, String location) {}
    public record UpdateReq(String title, String startAtIso, String endAtIso, EventType type, String location) {}

    /* ===== 조회 ===== */

    // 목록
    @GetMapping("/events")
    public ResponseEntity<List<EventDto>> list(@PathVariable Long projectId) {
        return ResponseEntity.ok(eventService.listByProject(projectId));
    }

    // 기간 조회: /projects/{pid}/events/range?from=YYYY-MM-DD&to=YYYY-MM-DD
    @GetMapping("/events/range")
    public ResponseEntity<List<EventDto>> findInRange(
            @PathVariable Long projectId,
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        if (to.isBefore(from)) {
            // 실수로 from/to 순서를 바꿔 보낸 경우 스왑
            LocalDate tmp = from; from = to; to = tmp;
        }
        return ResponseEntity.ok(eventService.findInRange(projectId, from, to));
    }

    /* ===== 쓰기 ===== */

    @PostMapping("/events")
    public ResponseEntity<EventDto> create(@PathVariable Long projectId,
                                           @RequestBody CreateReq req) {
        var e = eventService.create(projectId, req.title(), req.startAtIso(), req.endAtIso(), req.type(), req.location());
        return ResponseEntity.ok(EventDto.from(e));
    }

    @PatchMapping("/events/{id}")
    public ResponseEntity<EventDto> update(@PathVariable Long projectId,
                                           @PathVariable Long id,
                                           @RequestBody UpdateReq req) {
        var e = eventService.update(projectId, id, req.title(), req.startAtIso(), req.endAtIso(), req.type(), req.location());
        return ResponseEntity.ok(EventDto.from(e));
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long projectId, @PathVariable Long id) {
        eventService.delete(projectId, id);
        return ResponseEntity.noContent().build();
    }
}
