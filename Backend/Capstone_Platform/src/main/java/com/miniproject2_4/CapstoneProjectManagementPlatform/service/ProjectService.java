package com.miniproject2_4.CapstoneProjectManagementPlatform.service;

import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.CreateProjectRequest;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectDetailDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.controller.dto.ProjectListDto;
import com.miniproject2_4.CapstoneProjectManagementPlatform.entity.*;
import com.miniproject2_4.CapstoneProjectManagementPlatform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AssignmentRepository assignmentRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** /api/projects → FE ProjectListDto */
    public List<ProjectListDto> listProjects() {
        return projectRepository.findAllWithTeam().stream()
                .map(this::toListDto)
                .toList();
    }

    /**
     * 새 프로젝트 생성: 기존 팀 선택
     * - ADMIN 은 팀 멤버가 아니어도 생성 허용(운영 편의)
     * - 그 외(교수/학생)는 해당 팀의 '멤버'여야 함
     * - DB 정책상 professor가 필수인 경우를 위해:
     *   ① req.getProfessorId() 가 오면 교수 여부 검증 후 지정
     *   ② 없으면 팀 멤버 중 첫 교수(Role.PROFESSOR) 자동 지정
     *   ③ 그래도 없으면 400(PROFESSOR_REQUIRED)
     * - 초기 status는 **ACTIVE**
     */
    @Transactional
    public ProjectListDto createProject(CreateProjectRequest request, UserAccount creator) {
        if (creator == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }

        // 1) 팀 존재 확인
        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "선택한 팀이 존재하지 않습니다."));

        // 2) 권한: ADMIN 은 우회 허용, 그 외는 팀 멤버만
        boolean isAllowed = (creator.getRole() == Role.ADMIN)
                || teamMemberRepository.existsByTeam_IdAndUser_Id(team.getId(), creator.getId());
        if (!isAllowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "선택한 팀의 멤버가 아닙니다.");
        }

        // 프로젝트 타이틀 중복 체크
        if (projectRepository.existsByTitleAndArchivedFalse(request.getTitle())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 존재하는 프로젝트 이름입니다: " + request.getTitle());
        }

        // 3) 담당 교수 결정
        UserAccount professor = resolveProfessorForTeam(team, request.getProfessorId());
        if (professor == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PROFESSOR_REQUIRED");
        }

        // 4) 프로젝트 생성
        Project project = Project.builder()
                .title(normalizeTitle(request.getTitle()))
                .team(team)
                .professor(professor)           // DB 트리거 합의
                .status(Project.Status.ACTIVE)  // 초기값 ACTIVE
                .archived(false)
                .build();

        project = projectRepository.save(project);
        return toListDto(project);
    }

    /** 내가 볼 수 있는 프로젝트 목록 */
    public List<ProjectListDto> listProjectsForUser(UserAccount ua) {
        if (ua == null) return List.of();

        if (ua.getRole() == Role.ADMIN) {
            return listProjects();
        } else {
            // 교수와 학생 모두 팀 멤버 기준으로 조회
            return projectRepository.findAllByMemberUserId(ua.getId()).stream()
                    .map(this::toListDto)
                    .toList();
        }
    }

    /** 교수 전용: 담당 프로젝트 목록 */
    public List<ProjectListDto> listProjectsByProfessor(Long userId) {
        return projectRepository.findAllByProfessorUserId(userId).stream()
                .map(this::toListDto)
                .toList();
    }

    /** Archive 필터 목록 */
    public List<ProjectListDto> listProjectsForUser(UserAccount ua, String status) {
        if (ua == null) return List.of();

        Boolean archived = "archived".equals(status);

        if (ua.getRole() == Role.ADMIN) {
            return projectRepository.findAllWithTeamByArchived(archived).stream()
                    .map(this::toListDto)
                    .toList();
        } else {
            // 교수와 학생 모두 팀 멤버 기준으로 조회
            return projectRepository.findAllByMemberUserIdAndArchived(ua.getId(), archived).stream()
                    .map(this::toListDto)
                    .toList();
        }
    }

    /** 프로젝트 상세 (권한 확인 포함) */
    public ProjectDetailDto getProjectDetail(Long projectId, UserAccount viewer) {
        Project p = projectRepository.findByIdWithTeamAndProfessor(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));

        boolean allowed;
        if (viewer.getRole() == Role.ADMIN) {
            allowed = true;
        } else if (viewer.getRole() == Role.PROFESSOR) {
            boolean isProfessor = (p.getProfessor() != null && Objects.equals(p.getProfessor().getId(), viewer.getId()));
            boolean isMember = (p.getTeam() != null) && teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), viewer.getId());
            allowed = isProfessor || isMember;
        } else {
            allowed = (p.getTeam() != null) && teamMemberRepository.existsByTeam_IdAndUser_Id(p.getTeam().getId(), viewer.getId());
        }
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "이 프로젝트를 열람할 권한이 없습니다.");
        }

        // 멤버 목록
        List<ProjectListDto.Member> members = (p.getTeam() == null)
                ? List.of()
                : teamMemberRepository.findWithUserByTeamId(p.getTeam().getId()).stream()
                .map(tm -> new ProjectListDto.Member(
                        tm.getUser() != null ? tm.getUser().getId() : null,
                        tm.getUser() != null
                                ? (tm.getUser().getName() != null ? tm.getUser().getName() : tm.getUser().getEmail())
                                : "이름없음"
                ))
                .toList();

        // 과제(작업) 목록/요약
        List<Assignment> assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(p.getId());
        int total = assigns.size();
        int done = 0, ongo = 0, pend = 0;
        for (Assignment a : assigns) {
            AssignmentStatus st = a.getStatus();
            if (st == AssignmentStatus.COMPLETED) done++;
            else if (st == AssignmentStatus.ONGOING) ongo++;
            else pend++;
        }
        int progress = total == 0 ? 0 : (int)Math.round(done * 100.0 / total);

        List<ProjectDetailDto.TaskItem> taskItems = assigns.stream()
                .map(a -> new ProjectDetailDto.TaskItem(
                        a.getId(),
                        a.getTitle(),
                        mapStatus(a.getStatus()),
                        a.getDueDate() != null ? a.getDueDate().format(ISO) : null
                ))
                .toList();

        // 일정(다가오는 순)
        LocalDateTime now = LocalDateTime.now();
        List<Event> events = eventRepository.findByProject_IdOrderByStartAtAsc(p.getId());
        List<ProjectDetailDto.EventItem> upcoming = events.stream()
                .filter(e -> e.getStartAt() != null && !e.getStartAt().isBefore(now))
                .map(e -> new ProjectDetailDto.EventItem(
                        e.getId(),
                        e.getTitle(),
                        e.getType() != null ? e.getType().name() : "ETC",
                        e.getStartAt() != null ? e.getStartAt().format(ISO) : null,
                        e.getEndAt() != null ? e.getEndAt().format(ISO) : null,
                        e.getLocation()
                ))
                .toList();

        // 마지막 활동 시간
        LocalDateTime luAssign = assigns.stream().map(Assignment::getDueDate).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime luEvent = events.stream().map(Event::getStartAt).filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime latest = latestOf(latestOf(luAssign, luEvent), p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt());

        // 링크(GitHub)
        List<ProjectDetailDto.ResourceLink> links = new ArrayList<>();
        if (p.getRepoOwner() != null && p.getGithubRepo() != null) {
            String url = "https://github.com/" + p.getRepoOwner() + "/" + p.getGithubRepo();
            links.add(new ProjectDetailDto.ResourceLink("GitHub 저장소", url));
        }

        return new ProjectDetailDto(
                p.getId(),
                p.getTitle() != null ? p.getTitle() : ("프로젝트 #" + p.getId() ),
                mapProjectStatus(p.getStatus()),
                new ProjectDetailDto.BasicTeam(
                        p.getTeam() != null ? p.getTeam().getId() : null,
                        p.getTeam() != null ? p.getTeam().getName() : "미지정 팀"
                ),
                (p.getProfessor() != null)
                        ? new ProjectDetailDto.BasicUser(p.getProfessor().getId(), p.getProfessor().getName(), p.getProfessor().getEmail())
                        : null,
                (p.getRepoOwner() != null || p.getGithubRepo() != null)
                        ? new ProjectDetailDto.RepoInfo(p.getRepoOwner(), p.getGithubRepo(),
                        (p.getRepoOwner() != null && p.getGithubRepo() != null)
                                ? "https://github.com/" + p.getRepoOwner() + "/" + p.getGithubRepo()
                                : null)
                        : null,
                p.getCreatedAt() != null ? p.getCreatedAt().format(ISO) : null,
                latest != null ? latest.format(ISO) : (p.getUpdatedAt() != null ? p.getUpdatedAt().format(ISO) : null),
                progress,
                new ProjectDetailDto.TaskSummary(total, done, ongo, pend),
                taskItems,
                upcoming,
                links
        );
    }

    /* ===== 깃허브 링크 업데이트 ===== */
    @Transactional
    public ProjectDetailDto updateGithubUrl(Long projectId, String githubUrl, UserAccount actor) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }

        // 권한 규칙: ADMIN/PROFESSOR 허용, STUDENT는 프로젝트 팀 멤버만 허용
        if (actor.getRole() == Role.STUDENT) {
            Project p0 = projectRepository.findByIdWithTeamAndProfessor(projectId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));
            boolean isMember = (p0.getTeam() != null) && teamMemberRepository.existsByTeam_IdAndUser_Id(p0.getTeam().getId(), actor.getId());
            if (!isMember) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_PROJECT_MEMBER");
        }

        Project p = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));

        if (githubUrl == null || githubUrl.trim().isEmpty()) {
            p.setRepoOwner(null);
            p.setGithubRepo(null);
        } else {
            String[] parsed = parseGithubOwnerRepo(githubUrl);
            String owner = parsed[0];
            String repo  = parsed[1];

            if (owner.length() > 50 || repo.length() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_GITHUB_URL");
            }

            p.setRepoOwner(owner);
            p.setGithubRepo(repo);
        }

        projectRepository.flush();
        return getProjectDetail(projectId, actor);
    }

    /* ===== 내부 유틸 ===== */

    /** GitHub URL/owner/repo 문자열을 owner/repo 튜플로 파싱 */
    private String[] parseGithubOwnerRepo(String raw) {
        String s = raw == null ? "" : raw.trim();

        if (s.startsWith("http://") || s.startsWith("https://")) {
            try {
                URI u = URI.create(s);
                String host = Optional.ofNullable(u.getHost()).orElse("");
                if (!host.equalsIgnoreCase("github.com") && !host.toLowerCase().endsWith(".github.com")) {
                    throw new IllegalArgumentException("not github host");
                }
                s = Optional.ofNullable(u.getPath()).orElse("");
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_GITHUB_URL");
            }
        }

        s = s.replaceAll("^/+", "").replaceAll("/+$", "");
        if (s.endsWith(".git")) s = s.substring(0, s.length() - 4);

        String[] parts = s.split("/");
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_GITHUB_URL");
        }

        String owner = parts[0];
        String repo  = parts[1];

        if (!owner.matches("[A-Za-z0-9-_.]+") || !repo.matches("[A-Za-z0-9-_.]+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_GITHUB_URL");
        }

        return new String[]{owner, repo};
    }

    /** 팀에서 교수 결정: 명시 id 우선, 없으면 팀 멤버 중 교수 1명 자동 선택 */
    private UserAccount resolveProfessorForTeam(Team team, Long explicitProfessorId) {
        if (explicitProfessorId != null) {
            UserAccount prof = userRepository.findById(explicitProfessorId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "교수 계정을 찾을 수 없습니다."));
            if (prof.getRole() != Role.PROFESSOR) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PROFESSOR_ID_INVALID");
            }
            return prof;
        }
        var members = teamMemberRepository.findWithUserByTeamId(team.getId());
        return members.stream()
                .map(TeamMember::getUser)
                .filter(Objects::nonNull)
                .filter(u -> u.getRole() == Role.PROFESSOR)
                .findFirst().orElse(null);
    }

    public ProjectListDto toListDto(Project p) {
        String teamName = (p.getTeam() != null && p.getTeam().getName() != null)
                ? p.getTeam().getName()
                : "미지정 팀";

        var members = (p.getTeam() == null)
                ? List.<ProjectListDto.Member>of()
                : teamMemberRepository.findWithUserByTeamId(p.getTeam().getId()).stream()
                .map(tm -> new ProjectListDto.Member(
                        tm.getUser() != null ? tm.getUser().getId() : null,
                        tm.getUser() != null ? (tm.getUser().getName() != null ? tm.getUser().getName() : tm.getUser().getEmail()) : "이름없음"
                ))
                .toList();

        var assigns = assignmentRepository.findByProject_IdOrderByDueDateAsc(p.getId());
        int total = assigns.size();
        int completed = (int) assigns.stream().filter(a -> a.getStatus() == AssignmentStatus.COMPLETED).count();
        int progress = total == 0 ? 0 : (int) Math.round(completed * 100.0 / total);

        var now = LocalDateTime.now();
        var next = assigns.stream()
                .filter(a -> a.getDueDate() != null && !a.getDueDate().isBefore(now))
                .min(Comparator.comparing(Assignment::getDueDate))
                .orElse(null);

        LocalDateTime luAssign = assigns.stream()
                .map(Assignment::getDueDate).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime luEvent = eventRepository.findByProject_IdOrderByStartAtAsc(p.getId()).stream()
                .map(Event::getStartAt).filter(Objects::nonNull)
                .max(Comparator.naturalOrder()).orElse(null);
        LocalDateTime latest = latestOf(
                latestOf(luAssign, luEvent),
                p.getUpdatedAt() != null ? p.getUpdatedAt() : p.getCreatedAt()
        );
        String lastUpdate = (latest != null) ? latest.format(ISO) : null;

        return new ProjectListDto(
                p.getId(),
                p.getTitle() != null ? p.getTitle() : ("프로젝트 #" + p.getId()),
                null,
                mapProjectStatus(p.getStatus()),
                teamName,
                lastUpdate,
                progress,
                members,
                new ProjectListDto.Milestones(completed, total),
                (next == null ? null : new ProjectListDto.NextDeadline(
                        next.getTitle(), next.getDueDate().format(ISO)))
        );
    }

    private String mapProjectStatus(Object raw) {
        if (raw == null) return "in-progress";
        String s = (raw instanceof Enum<?> e) ? e.name() : String.valueOf(raw);
        s = s.replace('_','-').toUpperCase();
        return switch (s) {
            case "ACTIVE", "IN-PROGRESS", "INPROGRESS" -> "in-progress";
            case "REVIEW", "REVIEWING" -> "review";
            case "COMPLETED", "DONE" -> "completed";
            case "PLANNING", "PLAN" -> "planning";
            default -> "in-progress";
        };
    }

    private String mapStatus(Object raw) {
        if (raw == null) return "pending";
        String s = (raw instanceof Enum<?> e) ? e.name() : String.valueOf(raw);
        s = s.replace('_','-').toUpperCase();
        return switch (s) {
            case "COMPLETED", "DONE" -> "completed";
            case "ONGOING", "IN-PROGRESS", "INPROGRESS", "ACTIVE" -> "ongoing";
            default -> "pending";
        };
    }

    private static LocalDateTime latestOf(LocalDateTime a, LocalDateTime b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.isAfter(b) ? a : b;
    }

    @Transactional
    public void archiveProject(Long projectId, UserAccount actor) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));
        checkArchivePermission(project, actor);
        if (Boolean.TRUE.equals(project.getArchived())) return;
        project.setArchived(true);
        projectRepository.save(project);
    }

    @Transactional
    public void restoreProject(Long projectId, UserAccount actor) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));
        checkArchivePermission(project, actor);
        if (!Boolean.TRUE.equals(project.getArchived())) return;
        project.setArchived(false);
        projectRepository.save(project);
    }

    @Transactional
    public void purgeProject(Long projectId, UserAccount actor) {
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        }
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "프로젝트가 존재하지 않습니다."));
        checkPurgePermission(project, actor);
        if (!Boolean.TRUE.equals(project.getArchived())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아카이브된 프로젝트만 영구 삭제할 수 있습니다.");
        }
        projectRepository.delete(project);
    }

    private void checkArchivePermission(Project project, UserAccount actor) {
        if (actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() == Role.PROFESSOR) {
            if (project.getProfessor() != null && project.getProfessor().getId().equals(actor.getId())) return;
        }
        if (project.getTeam() != null) {
            boolean isMember = teamMemberRepository.existsByTeam_IdAndUser_Id(project.getTeam().getId(), actor.getId());
            if (isMember) return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "프로젝트를 아카이브할 권한이 없습니다.");
    }

    private void checkPurgePermission(Project project, UserAccount actor) {
        if (actor.getRole() == Role.ADMIN) return;
        if (actor.getRole() == Role.PROFESSOR) {
            if (project.getProfessor() != null && project.getProfessor().getId().equals(actor.getId())) return;
        }
        if (project.getTeam() != null) {
            boolean isMember = teamMemberRepository.existsByTeam_IdAndUser_Id(project.getTeam().getId(), actor.getId());
            if (isMember) return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "프로젝트를 영구 삭제할 권한이 없습니다.");
    }

    private String normalizeTitle(String t) {
        if (t == null || t.isBlank()) return "새 프로젝트";
        return t.trim();
    }
}