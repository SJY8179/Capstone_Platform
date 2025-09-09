package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ScheduleDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Assignment;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.AssignmentStatus;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.Event;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.EventType;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.AssignmentRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.EventRepository;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class ScheduleService {

    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final ProjectRepository projectRepository;

    private static final DateTimeFormatter D = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter T = DateTimeFormatter.ofPattern("HH:mm");

    /** 데모: 첫 프로젝트 전체 */
    public List<ScheduleDto> listSchedules() {
        List<ScheduleDto> out = new ArrayList<>();
        var proj = projectRepository.findAll().stream().findFirst().orElse(null);
        Long projectId = proj != null ? proj.getId() : null;

        // Assignments
        var assigns = (projectId == null)
                ? List.<Assignment>of()
                : assignmentRepository.findByProject_IdOrderByDueDateAsc(projectId);

        for (var a : assigns) {
            String status = switch (a.getStatus() == null ? AssignmentStatus.ONGOING : a.getStatus()) {
                case COMPLETED -> "completed";
                case ONGOING -> "in-progress";
                case PENDING -> "pending";
            };
            out.add(new ScheduleDto(
                    "A-" + a.getId(), a.getTitle(), "",
                    "deadline", status, "medium",
                    a.getDueDate() != null ? a.getDueDate().toLocalDate().format(D) : null,
                    a.getDueDate() != null ? a.getDueDate().toLocalTime().format(T) : null,
                    null, // endTime (과제는 종료시간 없음)
                    null, // duration
                    "온라인",
                    proj != null ? proj.getTitle() : null
            ));
        }

        // Events
        var events = (projectId == null)
                ? List.<Event>of()
                : eventRepository.findByProject_IdOrderByStartAtAsc(projectId);

        for (var e : events) {
            String type = switch (e.getType() == null ? EventType.ETC : e.getType()) {
                case MEETING -> "meeting";
                case DEADLINE -> "deadline";
                case PRESENTATION -> "presentation";
                case ETC -> "task";
            };
            out.add(new ScheduleDto(
                    "E-" + e.getId(), e.getTitle(), "",
                    type, "scheduled", "low",
                    e.getStartAt() != null ? e.getStartAt().toLocalDate().format(D) : null,
                    e.getStartAt() != null ? e.getStartAt().toLocalTime().format(T) : null,
                    e.getEndAt()   != null ? e.getEndAt().toLocalTime().format(T)   : null, // endTime 추가
                    null, // duration
                    e.getLocation(),
                    proj != null ? proj.getTitle() : null
            ));
        }

        out.sort(Comparator.comparing((ScheduleDto s) -> s.date() == null ? "" : s.date())
                .thenComparing(s -> s.time() == null ? "" : s.time()));
        return out;
    }

    /** 기간 기반: onlyEvents=true면 Event만, 아니면 Assignment + Event */
    public List<ScheduleDto> listSchedulesInRange(
            Long projectId, Long teamId, LocalDate from, LocalDate to, boolean onlyEvents
    ) {
        var out = new ArrayList<ScheduleDto>();

        var proj = (projectId != null)
                ? projectRepository.findById(projectId).orElse(null)
                : (teamId != null
                ? projectRepository.findFirstByTeam_Id(teamId).orElse(null)
                : projectRepository.findAll().stream().findFirst().orElse(null));

        Long pid = proj != null ? proj.getId() : null;

        // (옵션) Assignments 포함
        if (!onlyEvents) {
            var assigns = (pid == null)
                    ? List.<Assignment>of()
                    : assignmentRepository.findByProject_IdOrderByDueDateAsc(pid)
                    .stream()
                    .filter(a -> a.getDueDate() != null)
                    .filter(a -> {
                        var d = a.getDueDate().toLocalDate();
                        return !d.isBefore(from) && !d.isAfter(to);
                    })
                    .toList();

            for (var a : assigns) {
                String status = switch (a.getStatus() == null ? AssignmentStatus.ONGOING : a.getStatus()) {
                    case COMPLETED -> "completed";
                    case ONGOING -> "in-progress";
                    case PENDING -> "pending";
                };
                out.add(new ScheduleDto(
                        "A-" + a.getId(), a.getTitle(), "",
                        "deadline", status, "medium",
                        a.getDueDate().toLocalDate().format(D),
                        a.getDueDate().toLocalTime().format(T),
                        null, // endTime (과제는 종료시간 없음)
                        null, // duration
                        "온라인",
                        proj != null ? proj.getTitle() : null
                ));
            }
        }

        // Events (범위와 겹치는 것 모두)
        var evs = (pid == null)
                ? List.<Event>of()
                : eventRepository.findInRange(pid, from.atStartOfDay(), to.atTime(LocalTime.MAX));

        for (var e : evs) {
            String type = switch (e.getType() == null ? EventType.ETC : e.getType()) {
                case MEETING -> "meeting";
                case DEADLINE -> "deadline";
                case PRESENTATION -> "presentation";
                case ETC -> "task";
            };
            out.add(new ScheduleDto(
                    "E-" + e.getId(), e.getTitle(), "",
                    type, "scheduled", "low",
                    e.getStartAt() != null ? e.getStartAt().toLocalDate().format(D) : null,
                    e.getStartAt() != null ? e.getStartAt().toLocalTime().format(T) : null,
                    e.getEndAt()   != null ? e.getEndAt().toLocalTime().format(T)   : null, // endTime 추가
                    null, // duration
                    e.getLocation(),
                    proj != null ? proj.getTitle() : null
            ));
        }

        out.sort(Comparator.comparing((ScheduleDto s) -> s.date() == null ? "" : s.date())
                .thenComparing(s -> s.time() == null ? "" : s.time()));
        return out;
    }
}
