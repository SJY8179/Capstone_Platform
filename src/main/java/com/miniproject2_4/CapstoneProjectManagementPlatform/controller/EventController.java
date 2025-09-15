package com.miniproject2_4.CapstoneProjectManagementPlatform.controller;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.EventDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.EventRequests;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.UserAccount;
import com.miniproject2_4.CapstoneProjectManagementPlatform.service.EventService;
import com.miniproject2_4.CapstoneProjectManagementPlatform.util.ProjectAccessGuard;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/projects/{projectId}")
public class EventController {

    private final EventService eventService;
    private final ProjectAccessGuard projectAccessGuard;

    /* ===== 요청 바디용 내부 레코드 ===== */
    public record CreateReq(String title, String startAtIso, String endAtIso, EventType type, String location) {}
    public record UpdateReq(String title, String startAtIso, String endAtIso, EventType type, String location) {}

    private UserAccount currentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }
        Object p = auth.getPrincipal();
        if (p instanceof UserAccount ua) return ua;
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
    }

    @GetMapping("/events")
    public ResponseEntity<List<EventDto>> list(@PathVariable Long projectId, Authentication auth) {
        projectAccessGuard.assertCanViewProject(projectId, currentUser(auth));
        return ResponseEntity.ok(eventService.listByProject(projectId));
    }

    // /projects/{pid}/events/range?from=YYYY-MM-DD&to=YYYY-MM-DD
    @GetMapping("/events/range")
    public ResponseEntity<List<EventDto>> findInRange(
            @PathVariable Long projectId,
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to")   @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication auth
    ) {
        projectAccessGuard.assertCanViewProject(projectId, currentUser(auth));
        if (to.isBefore(from)) {
            LocalDate tmp = from; from = to; to = tmp;
        }
        return ResponseEntity.ok(eventService.findInRange(projectId, from, to));
    }

    @PostMapping("/events")
    public ResponseEntity<EventDto> create(@PathVariable Long projectId,
                                           @RequestBody @Valid EventRequests.Create req,
                                           Authentication auth) {
        projectAccessGuard.assertCanManageEvents(projectId, currentUser(auth));
        var e = eventService.create(projectId, req.title(), req.startAtIso(), req.endAtIso(), req.type(), req.location());
        return ResponseEntity.ok(EventDto.from(e));
    }

    @PatchMapping("/events/{id}")
    public ResponseEntity<EventDto> update(@PathVariable Long projectId,
                                           @PathVariable Long id,
                                           @RequestBody @Valid EventRequests.Update req,
                                           Authentication auth) {
        projectAccessGuard.assertCanManageEvents(projectId, currentUser(auth));
        var e = eventService.update(projectId, id, req.title(), req.startAtIso(), req.endAtIso(), req.type(), req.location());
        return ResponseEntity.ok(EventDto.from(e));
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long projectId, @PathVariable Long id, Authentication auth) {
        projectAccessGuard.assertCanManageEvents(projectId, currentUser(auth));
        eventService.delete(projectId, id);
        return ResponseEntity.noContent().build();
    }
}
