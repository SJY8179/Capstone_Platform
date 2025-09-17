package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.ProfessorAssignmentRequest.Status;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProfessorAssignmentService {

    private final ProfessorAssignmentRequestRepository requestRepository;
    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final EventService eventService;

    /* =================== 사전요청: 프로젝트 없이 팀/타이틀로 요청 =================== */

    /**
     * 사전요청 생성 (프로젝트가 아직 없을 때)
     */
    @Transactional
    public ProfessorAssignmentRequest createPreRequest(Long teamId,
                                                       String title,
                                                       Long targetProfessorId,
                                                       String message,
                                                       UserAccount requester) {
        if (requester == null)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "팀을 찾을 수 없습니다."));

        boolean allowed = requester.getRole() == Role.ADMIN
                || teamMemberRepository.existsByTeam_IdAndUser_Id(team.getId(), requester.getId());
        if (!allowed)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_TEAM_MEMBER");

        if (title == null || title.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "TITLE_REQUIRED");

        // 동일 팀/제목으로 PENDING 중복 방지
        if (requestRepository.existsByTeam_IdAndTitleIgnoreCaseAndStatus(teamId, title.trim(), Status.PENDING)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ALREADY_PENDING");
        }

        UserAccount professor = userRepository.findById(targetProfessorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "교수 계정을 찾을 수 없습니다."));
        if (professor.getRole() != Role.PROFESSOR)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PROFESSOR_ID_INVALID");

        ProfessorAssignmentRequest req = ProfessorAssignmentRequest.builder()
                .project(null)                 // 사전요청
                .team(team)
                .requestedBy(requester)
                .targetProfessor(professor)
                .status(Status.PENDING)
                .message(message)
                .title(title.trim())
                .build();

        return requestRepository.save(req);
    }

    /* =================== 사후요청: 이미 프로젝트가 있을 때 =================== */

    /** 요청 생성: 팀 멤버(또는 ADMIN)만 가능 */
    @Transactional
    public ProfessorAssignmentRequest createRequest(Long projectId, Long targetProfessorId, String message, UserAccount requester) {
        if (requester == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));

        boolean allowed = requester.getRole() == Role.ADMIN
                || (project.getTeam() != null && teamMemberRepository.existsByTeam_IdAndUser_Id(project.getTeam().getId(), requester.getId()));
        if (!allowed) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");

        if (requestRepository.existsByProject_IdAndStatus(projectId, Status.PENDING)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ALREADY_PENDING");
        }

        UserAccount professor = userRepository.findById(targetProfessorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "교수 계정을 찾을 수 없습니다."));
        if (professor.getRole() != Role.PROFESSOR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PROFESSOR_ID_INVALID");
        }

        ProfessorAssignmentRequest req = ProfessorAssignmentRequest.builder()
                .project(project)
                .team(project.getTeam())
                .requestedBy(requester)
                .targetProfessor(professor)
                .status(Status.PENDING)
                .message(message)
                .title(project.getTitle() != null ? project.getTitle() : "프로젝트") // 응답 일관성
                .build();

        return requestRepository.save(req);
    }

    /** 교수 본인의 대기중 요청 목록 */
    public List<ProfessorAssignmentRequest> listPendingForProfessor(Long professorUserId) {
        return requestRepository.findByTargetProfessor_IdAndStatusOrderByCreatedAtDesc(professorUserId, Status.PENDING);
    }

    /** 승인: 대상 교수만 가능 */
    @Transactional
    public void approve(Long requestId, UserAccount actor) {
        ProfessorAssignmentRequest req = loadRequestForAction(requestId, actor);

        // 이미 처리된 요청이면 무시(또는 409)
        if (req.getStatus() != Status.PENDING) return;

        Project project = req.getProject();

        if (project == null) {
            // 사전요청 승인 → 실제 프로젝트 생성 (교수 지정 필수)
            project = Project.builder()
                    .title(req.getTitle())
                    .team(req.getTeam())
                    .professor(actor)                 // DB 트리거에 부합
                    .status(Project.Status.ACTIVE)
                    .archived(false)
                    .build();
            project = projectRepository.save(project);
            req.setProject(project);
        } else {
            // 사후요청 승인 → 기존 프로젝트에 교수 지정
            project.setProfessor(actor);
        }

        // 팀 멤버 편입(MEMBER) — 이미 있으면 생략
        Team team = project.getTeam();
        if (team != null) {
            boolean exists = teamMemberRepository.existsByTeam_IdAndUser_Id(team.getId(), actor.getId());
            if (!exists) {
                TeamMemberId id = new TeamMemberId(team.getId(), actor.getId());
                TeamMember member = TeamMember.builder()
                        .id(id).team(team).user(actor)
                        .roleInTeam(TeamRole.MEMBER.name())
                        .build();
                teamMemberRepository.save(member);
            }
        }

        // 요청 상태 업데이트
        req.setStatus(Status.APPROVED);
        req.setDecidedBy(actor);
        req.setDecidedAt(LocalDateTime.now());

        // 이벤트 로깅
        eventService.logSystemActivity(
                "담당 교수 지정 승인: " + actor.getName(),
                project.getId()
        );
    }

    /** 거절: 대상 교수만 가능 */
    @Transactional
    public void reject(Long requestId, String message, UserAccount actor) {
        ProfessorAssignmentRequest req = loadRequestForAction(requestId, actor);

        if (req.getStatus() != Status.PENDING) return;

        req.setStatus(Status.REJECTED);
        req.setDecidedBy(actor);
        req.setDecidedAt(LocalDateTime.now());
        if (message != null && !message.isBlank()) {
            req.setMessage(message);
        }

        Long projectId = (req.getProject() != null ? req.getProject().getId() : null);
        if (projectId != null) {
            eventService.logSystemActivity("담당 교수 지정 거절: " + actor.getName(), projectId);
        }
    }

    private ProfessorAssignmentRequest loadRequestForAction(Long requestId, UserAccount actor) {
        if (actor == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        ProfessorAssignmentRequest req = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "요청을 찾을 수 없습니다."));
        // 대상 교수 본인만 승인/거절
        if (actor.getRole() != Role.PROFESSOR || !actor.getId().equals(req.getTargetProfessor().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ONLY_TARGET_PROFESSOR_CAN_DECIDE");
        }
        return req;
    }
}
