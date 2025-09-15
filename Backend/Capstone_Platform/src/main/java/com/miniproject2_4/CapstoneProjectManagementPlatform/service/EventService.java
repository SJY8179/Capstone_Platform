package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.EventDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Event;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Project;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.EventRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import jakarta.persistence.EntityNotFoundException;
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

    @Transactional(readOnly = true)
    public List<EventDto> listByProject(Long projectId) {
        return eventRepository.findByProject_IdOrderByStartAtAsc(projectId)
                .stream().map(EventDto::from).toList();
    }

    /**
     * 검색 윈도우: [from 00:00, to+1일 00:00)
     */
    @Transactional(readOnly = true)
    public List<EventDto> findInRange(Long projectId, LocalDate from, LocalDate to) {
        if (projectId == null || from == null || to == null) {
            throw new IllegalArgumentException("projectId, from, to는 null일 수 없습니다.");
        }
        var fromTs = from.atStartOfDay();
        var toExclusive = to.plusDays(1).atStartOfDay();
        return eventRepository.findInRange(projectId, fromTs, toExclusive)
                .stream().map(EventDto::from).toList();
    }

    @Transactional
    public Event create(Long projectId, String title, String startAtIso, String endAtIso, EventType type, String location) {
        Project prj = projectRepository.findById(projectId)
                .orElseThrow(() -> new EntityNotFoundException("프로젝트가 존재하지 않습니다. id=" + projectId));

        Event e = new Event();
        e.setProject(prj);
        e.setTitle(title == null ? "" : title);
        e.setStartAt(parseDateTime(startAtIso));
        e.setEndAt(parseDateTime(endAtIso)); // 빈문자/널 → null
        e.setType(type == null ? EventType.MEETING : type);
        e.setLocation((location == null || location.isBlank()) ? null : location);

        return eventRepository.save(e);
    }

    @Transactional
    public Event update(Long projectId, Long id, String title, String startAtIso, String endAtIso, EventType type, String location) {
        Event e = eventRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("이벤트가 존재하지 않습니다. id=" + id));
        if (!e.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("프로젝트가 일치하지 않습니다.");
        }

        if (title != null) e.setTitle(title);
        if (startAtIso != null) e.setStartAt(parseDateTime(startAtIso));
        if (endAtIso != null) e.setEndAt(parseDateTime(endAtIso));
        if (type != null) e.setType(type);
        if (location != null) e.setLocation(location.isBlank() ? null : location);

        return eventRepository.save(e);
    }

    @Transactional
    public void delete(Long projectId, Long id) {
        Event e = eventRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("이벤트가 존재하지 않습니다. id=" + id));
        if (!e.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("프로젝트가 일치하지 않습니다.");
        }
        eventRepository.delete(e);
    }

    /** "yyyy-MM-ddTHH:mm:ss" | Offset | Instant | "yyyy-MM-dd" 지원 */
    private static LocalDateTime parseDateTime(String v) {
        if (v == null || v.isBlank()) return null;
        try { return LocalDateTime.ofInstant(Instant.parse(v), ZoneId.systemDefault()); } catch (DateTimeException ignore) {}
        try { return OffsetDateTime.parse(v).toLocalDateTime(); } catch (DateTimeException ignore) {}
        try { return LocalDateTime.parse(v); } catch (DateTimeException ignore) {}
        var d = LocalDate.parse(v);
        return d.atStartOfDay();
    }
}
