package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.EventDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Event;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.EventRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final ProjectRepository projectRepository;

    /** 고정 타임존(권장) */
    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    /* ===== 조회 ===== */

    @Transactional(readOnly = true)
    public List<EventDto> listByProject(Long projectId) {
        var events = eventRepository.findByProject_IdOrderByStartAtAsc(projectId);
        return events.stream().map(EventDto::from).toList();
    }

    /**
     * from/to는 LocalDate(YYYY-MM-DD)로 들어오며,
     * 검색 윈도우는 [from 00:00, to+1일 00:00) — 겹침(overlap) 포함 검색.
     */
    @Transactional(readOnly = true)
    public List<EventDto> findInRange(Long projectId, LocalDate from, LocalDate to) {
        if (projectId == null || from == null || to == null) {
            throw new IllegalArgumentException("projectId, from, to는 null일 수 없습니다.");
        }
        LocalDateTime fromInclusive = from.atStartOfDay();           // 포함
        LocalDateTime toExclusive   = to.plusDays(1).atStartOfDay(); // 제외
        return eventRepository.findInRange(projectId, fromInclusive, toExclusive)
                .stream().map(EventDto::from).toList();
    }

    /* ===== 쓰기 ===== */

    @Transactional
    public Event create(Long projectId, String title, String startAtIso, String endAtIso, EventType type, String location) {
        var proj = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));

        var e = new Event();
        e.setProject(proj);
        e.setTitle(nz(title));
        e.setType(type != null ? type : EventType.ETC);
        e.setStartAt(parseDateTime(startAtIso));
        e.setEndAt(parseDateTime(endAtIso));   // null 허용
        e.setLocation(location);
        return eventRepository.save(e);
    }

    @Transactional
    public Event update(Long projectId, Long eventId, String title, String startAtIso, String endAtIso, EventType type, String location) {
        var e = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));
        if (!e.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Event does not belong to project: " + projectId);
        }
        if (title != null) e.setTitle(title);
        if (type != null) e.setType(type);
        if (startAtIso != null) e.setStartAt(parseDateTime(startAtIso));
        if (endAtIso != null) e.setEndAt(parseDateTime(endAtIso)); // ""(빈문자) -> null로 세팅됨
        if (location != null) e.setLocation(location);
        return eventRepository.save(e);
    }

    @Transactional
    public void delete(Long projectId, Long eventId) {
        var e = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + eventId));
        if (!e.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Event does not belong to project: " + projectId);
        }
        eventRepository.delete(e);
    }

    /* ===== 유틸 ===== */

    private static String nz(String v) { return v == null ? "" : v; }

    /** "yyyy-MM-ddTHH:mm:ss" | Offset | Instant | "yyyy-MM-dd" 지원 */
    private static LocalDateTime parseDateTime(String v) {
        if (v == null || v.isBlank()) return null;
        try { return LocalDateTime.ofInstant(Instant.parse(v), ZONE); } catch (DateTimeException ignore) {}
        try { return OffsetDateTime.parse(v).toLocalDateTime(); } catch (DateTimeException ignore) {}
        try { return LocalDateTime.parse(v); } catch (DateTimeException ignore) {}
        // date-only
        var d = LocalDate.parse(v);
        return d.atStartOfDay();
    }
}
